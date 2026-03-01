import { createMistral } from "@ai-sdk/mistral";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { RunnerCtx } from "../shared/types";
import { MANAGER_MODEL } from "../models";

const MAX_RETRIES_PER_STEP = 2;

const planSchema = z.object({
	steps: z
		.array(
			z.object({
				description: z.string(),
				command: z.string(),
			}),
		)
		.max(10),
});

export async function runGeneralTask(
	ctx: RunnerCtx,
	agentId: string,
	task: { title: string; description?: string },
	role: string,
): Promise<string> {
	const mistralClient = createMistral();

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
				content:
					"You are a task planner. Given a task, produce a sequence of shell commands to accomplish it. Each step should have a description and a shell command. The working directory is /home/user. The shared workspace is /home/company/. Save outputs to /home/company/outputs/. Keep steps concise and practical.",
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
					model: mistralClient("magistral-medium-latest"),
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

	// If zero steps succeeded, the task genuinely failed — throw so the main
	// runner propagates failure status to the manager.
	if (succeeded === 0 && results.length > 0) {
		throw new Error(`All ${results.length} steps failed.\n\n${summary}`);
	}

	return summary;
}
