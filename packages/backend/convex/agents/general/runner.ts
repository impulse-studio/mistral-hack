import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { RunnerCtx, RunnerResult } from "../shared/types";
import { MANAGER_MODEL } from "../models";
import { SANDBOX_WORK_DIR, SHARED_WORKSPACE, SHARED_OUTPUTS } from "../../sandbox/constants";

const MAX_RETRIES_PER_STEP = 2;

const planSchema = z.object({
	steps: z
		.array(
			z.object({
				description: z.string(),
				command: z.string(),
			}),
		)
		.max(6),
});

const TIME_BUDGET_MS = 540_000; // 9 minutes — leave 60s safety margin before Convex 600s limit

export async function runGeneralTask(
	ctx: RunnerCtx,
	agentId: string,
	task: { title: string; description?: string },
	role: string,
): Promise<RunnerResult> {
	const startTime = Date.now();
	const mistralClient = createAmazonBedrock({ region: "us-west-2" });

	// ── Phase 1: Planning ──────────────────────────────────────
	await ctx.runMutation(internal.logs.mutations.append, {
		agentId,
		type: "status" as const,
		content: `[${role}] Planning steps for: ${task.title}`,
	});

	// Use mistral-large for structured output (magistral doesn't support generateObject)
	const { object: plan } = await generateObject({
		model: mistralClient(MANAGER_MODEL),
		schema: planSchema,
		messages: [
			{
				role: "system",
				content: `You are a task planner. Given a task, produce a sequence of shell commands to accomplish it. Each step should have a description and a shell command. The working directory is ${SANDBOX_WORK_DIR}. The shared workspace is ${SHARED_WORKSPACE}/. Save outputs to ${SHARED_OUTPUTS}/. IMPORTANT: Each command runs in an independent shell — \`cd\` does NOT persist between steps. Use \`cd /path && command\` to run in a specific directory. Prefer fewer steps that combine related operations.`,
			},
			{
				role: "user",
				content: `Task: ${task.title}\n\nDescription: ${task.description ?? "No additional details."}`,
			},
		],
	});

	await ctx.runMutation(internal.logs.mutations.append, {
		agentId,
		type: "status" as const,
		content: `[${role}] Plan: ${plan.steps.length} steps`,
	});

	// ── Phase 2: Execution ─────────────────────────────────────
	const results: Array<{
		step: string;
		command: string;
		output: string;
		success: boolean;
	}> = [];

	for (let i = 0; i < plan.steps.length; i++) {
		// Time budget guard — break early to allow summary generation
		if (Date.now() - startTime > TIME_BUDGET_MS) {
			await ctx.runMutation(internal.logs.mutations.append, {
				agentId,
				type: "status" as const,
				content: `[${role}] Time budget reached — skipping remaining ${plan.steps.length - i} steps`,
			});
			break;
		}

		const step = plan.steps[i];
		await ctx.runMutation(internal.logs.mutations.append, {
			agentId,
			type: "status" as const,
			content: `[${role}] Step ${i + 1}/${plan.steps.length}: ${step.description}`,
		});

		let command = step.command;
		let lastOutput = "";
		let success = false;

		for (let attempt = 0; attempt <= MAX_RETRIES_PER_STEP; attempt++) {
			if (attempt > 0) {
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "status" as const,
					content: `[${role}] Retry ${attempt}/${MAX_RETRIES_PER_STEP} for step ${i + 1}`,
				});
			}

			const execResult = await ctx.runAction(internal.sandbox.execute.runCommand, {
				command,
				agentId,
				stream: false,
			});

			lastOutput = execResult.result ?? "(no output)";

			if (execResult.exitCode === 0) {
				success = true;
				break;
			}

			// Command failed — ask Mistral for a fix
			if (attempt < MAX_RETRIES_PER_STEP) {
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "stderr" as const,
					content: `Step ${i + 1} failed (exit ${execResult.exitCode}). Asking for fix...`,
				});

				const { text: fixCommand } = await generateText({
					model: mistralClient(MANAGER_MODEL),
					messages: [
						{
							role: "system",
							content:
								"You are a debugging assistant. A shell command failed. Provide a single corrected shell command that fixes the issue. Reply with ONLY the command, no explanation.",
						},
						{
							role: "user",
							content: `Original goal: ${step.description}\nFailed command: ${command}\nError output: ${lastOutput}\n\nProvide a corrected command:`,
						},
					],
				});

				command = fixCommand.trim();
			}
		}

		results.push({
			step: step.description,
			command,
			output: lastOutput,
			success,
		});
	}

	// ── Phase 3: Summary ───────────────────────────────────────
	const succeeded = results.filter((r) => r.success).length;
	const failed = results.filter((r) => !r.success).length;

	const lines: string[] = [
		`## Task: ${task.title}`,
		`**Result:** ${succeeded}/${results.length} steps succeeded${failed > 0 ? `, ${failed} failed` : ""}`,
		"",
	];

	for (const r of results) {
		const icon = r.success ? "OK" : "FAIL";
		lines.push(`[${icon}] ${r.step}`);
		// Include a snippet of output (cap at 500 chars)
		const snippet = r.output.length > 500 ? `${r.output.slice(0, 500)}...` : r.output;
		if (snippet && snippet !== "(no output)") {
			lines.push(`    ${snippet}`);
		}
	}

	const summary = lines.join("\n");

	await ctx.runMutation(internal.logs.mutations.append, {
		agentId,
		type: "status" as const,
		content: `[${role}] Done — ${succeeded}/${results.length} steps succeeded`,
	});

	const allFailed = succeeded === 0 && results.length > 0;
	return { success: !allFailed, result: summary };
}
