import { generateObject, generateText } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { RunnerCtx, RunnerResult } from "../shared/types";
import { mistral, REASONING_MODEL, MANAGER_MODEL } from "../models";

type TaskRecord = { title: string; description?: string };

const TIME_BUDGET_MS = 540_000; // 9 min — leave 60s margin before Convex 600s limit
const MAX_STEPS = 8;

// ── Step schemas ────────────────────────────────────────────────

const stepSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("shell"),
		description: z.string().describe("What this command investigates"),
		command: z.string().describe("Shell command to run in /home/user (cd doesn't persist)"),
	}),
	z.object({
		type: z.literal("web"),
		description: z.string().describe("What you want to learn from this URL"),
		url: z.string().describe("URL to fetch (supports any public URL)"),
	}),
	z.object({
		type: z.literal("done"),
		summary: z.string().describe("Final research findings — comprehensive and structured"),
	}),
]);

const planSchema = z.object({
	steps: z.array(stepSchema).min(1).max(MAX_STEPS),
});

type Step = z.infer<typeof stepSchema>;

// ── Main researcher runner ──────────────────────────────────────

export async function runResearcherTask(
	ctx: RunnerCtx,
	agentId: string,
	task: TaskRecord,
): Promise<RunnerResult> {
	const startTime = Date.now();

	await log(ctx, agentId, "status", `[researcher] Planning research: ${task.title}`);

	// Phase 1: Plan research steps
	const { object: plan } = await generateObject({
		model: mistral(MANAGER_MODEL),
		schema: planSchema,
		messages: [
			{
				role: "system",
				content: `You are a research planner. Given a research task, produce steps to investigate it.

Available step types:
- "shell": Run a shell command in the sandbox (working dir: /home/user, shared: /home/company/)
  Good for: file analysis, git log, grep, find, wc, reading code, running scripts
  Note: cd does NOT persist between steps — use "cd /path && command"
- "web": Fetch a URL and get readable text content (proxied through backend — full internet access)
  Good for: documentation, APIs, web research, news, reference material
- "done": Final step — provide comprehensive research summary

Rules:
- Always end with a "done" step containing your findings
- Use "web" for any information that requires internet access
- Use "shell" for local file/code analysis in the sandbox
- Be strategic — plan the most informative steps first
- Max ${MAX_STEPS} steps total`,
			},
			{
				role: "user",
				content: `Research task: ${task.title}\n\nDetails: ${task.description ?? "No additional details."}`,
			},
		],
	});

	await log(ctx, agentId, "status", `[researcher] Plan: ${plan.steps.length} steps`);

	// Phase 2: Execute steps, collecting findings
	const findings: Array<{ step: string; type: string; result: string; success: boolean }> = [];

	for (let i = 0; i < plan.steps.length; i++) {
		if (Date.now() - startTime > TIME_BUDGET_MS) {
			await log(
				ctx,
				agentId,
				"status",
				`[researcher] Time budget reached — skipping remaining ${plan.steps.length - i} steps`,
			);
			break;
		}

		const step = plan.steps[i];
		await log(
			ctx,
			agentId,
			"status",
			`[researcher] Step ${i + 1}/${plan.steps.length}: ${step.type} — ${getStepDesc(step)}`,
		);

		if (step.type === "done") {
			findings.push({ step: "Summary", type: "done", result: step.summary, success: true });
			break;
		}

		const result = await executeStep(ctx, agentId, step);
		findings.push(result);
	}

	// Phase 3: Synthesize findings into final report
	await log(ctx, agentId, "status", "[researcher] Synthesizing findings...");

	const findingsText = findings
		.map(
			(f, i) =>
				`### Step ${i + 1}: ${f.step}\n**Type:** ${f.type} | **Status:** ${f.success ? "OK" : "FAILED"}\n${f.result}`,
		)
		.join("\n\n");

	const { text: report } = await generateText({
		model: mistral(REASONING_MODEL),
		messages: [
			{
				role: "system",
				content:
					"You are a research analyst. Synthesize the raw findings below into a clear, structured research report. Include key findings, relevant data, and actionable conclusions. Use markdown formatting. Be thorough but concise.",
			},
			{
				role: "user",
				content: `# Research Task: ${task.title}\n\n${task.description ?? ""}\n\n# Raw Findings\n\n${findingsText}`,
			},
		],
	});

	// Save report to shared volume
	const filename = toFilename(task.title);
	const outputPath = `/home/company/outputs/${filename}`;
	try {
		await ctx.runAction(internal.sandbox.execute.runCommand, {
			command: `mkdir -p /home/company/outputs && cat > '${outputPath}' << 'RESEARCHER_EOF'\n${report}\nRESEARCHER_EOF`,
			agentId,
			stream: false,
		});
		await log(ctx, agentId, "status", `[researcher] Report saved to ${outputPath}`);
	} catch {
		// Non-fatal — report is still in the result
	}

	const succeeded = findings.filter((f) => f.success).length;
	const failed = findings.filter((f) => !f.success).length;
	await log(
		ctx,
		agentId,
		"status",
		`[researcher] Done — ${succeeded} steps succeeded, ${failed} failed`,
	);

	const allFailed = succeeded === 0 && findings.length > 0;
	return { success: !allFailed, result: report };
}

// ── Step execution ──────────────────────────────────────────────

async function executeStep(
	ctx: RunnerCtx,
	agentId: string,
	step: Extract<Step, { type: "shell" }> | Extract<Step, { type: "web" }>,
): Promise<{ step: string; type: string; result: string; success: boolean }> {
	if (step.type === "shell") {
		try {
			const execResult = await ctx.runAction(internal.sandbox.execute.runCommand, {
				command: step.command,
				agentId,
				stream: false,
			});
			const output = execResult.result ?? "(no output)";
			// Cap output at 5000 chars to keep context manageable
			const capped = output.length > 5000 ? `${output.slice(0, 5000)}\n... (truncated)` : output;
			return {
				step: step.description,
				type: "shell",
				result: capped,
				success: execResult.exitCode === 0,
			};
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			return { step: step.description, type: "shell", result: `Error: ${msg}`, success: false };
		}
	}

	// Web fetch — proxied through Convex backend
	try {
		const fetchResult = await ctx.runAction(internal.sandbox.webFetch.fetchReadable, {
			url: step.url,
		});
		if (!fetchResult.ok) {
			return {
				step: step.description,
				type: "web",
				result: `HTTP ${fetchResult.status}: ${fetchResult.text}`,
				success: false,
			};
		}
		const content = fetchResult.title
			? `# ${fetchResult.title}\n\n${fetchResult.text}`
			: fetchResult.text;
		return {
			step: step.description,
			type: "web",
			result: content,
			success: true,
		};
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return { step: step.description, type: "web", result: `Fetch error: ${msg}`, success: false };
	}
}

// ── Helpers ─────────────────────────────────────────────────────

function getStepDesc(step: Step): string {
	if (step.type === "shell") return step.description;
	if (step.type === "web") return `${step.description} (${step.url})`;
	return "Final summary";
}

function toFilename(title: string): string {
	return (
		(title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 80) || "research") + ".md"
	);
}

async function log(ctx: RunnerCtx, agentId: string, type: string, content: string): Promise<void> {
	await ctx.runMutation(internal.logs.mutations.append, {
		agentId,
		type: type as "status" | "command" | "stdout" | "stderr",
		content,
	});
}
