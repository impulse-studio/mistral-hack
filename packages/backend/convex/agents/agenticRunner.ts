import { generateText, stepCountIs } from "ai";
import { internal } from "../_generated/api";
import { mistral, MANAGER_MODEL } from "./models";
import { buildSkillset } from "./skills/index";
import { buildSystemPrompt } from "./prompts";
import type { RunnerCtx, RunnerResult } from "./shared/types";

const TIME_BUDGET_MS = 420_000; // 7 minutes — leave 3min buffer before Convex 600s hard limit
const MAX_STEPS = 50;

/**
 * Unified agentic runner — ReAct loop via AI SDK generateText + skills.
 * The model decides what tools to call and in what order.
 * Replaces role-specific runners (coder, general, researcher, copywriter).
 */
export async function runAgenticTask(
	ctx: RunnerCtx,
	agentId: string,
	task: { title: string; description?: string },
	role: string,
	agentName: string,
): Promise<RunnerResult> {
	const tools = buildSkillset(ctx, agentId, role);
	const systemPrompt = buildSystemPrompt(role, task, agentName);

	await ctx.runMutation(internal.logs.mutations.append, {
		agentId,
		type: "status" as const,
		content: `[${role}] Starting agentic task: ${task.title}`,
	});

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIME_BUDGET_MS);

	try {
		const result = await generateText({
			model: mistral(MANAGER_MODEL),
			system: systemPrompt,
			prompt: `Execute this task now:\n\n**${task.title}**\n${task.description ?? ""}`,
			tools,
			stopWhen: stepCountIs(MAX_STEPS),
			abortSignal: controller.signal,
			onStepFinish: async ({ staticToolCalls, staticToolResults }) => {
				// Log each step's tool usage for visibility in the UI
				if (staticToolCalls.length > 0) {
					for (const tc of staticToolCalls) {
						await ctx.runMutation(internal.logs.mutations.append, {
							agentId,
							type: "tool_call" as const,
							content: `[step] ${tc.toolName}(${JSON.stringify(tc.input).slice(0, 300)})`,
						});
					}
				}
				if (staticToolResults.length > 0) {
					for (const tr of staticToolResults) {
						const resultStr = typeof tr.output === "string" ? tr.output : JSON.stringify(tr.output);
						await ctx.runMutation(internal.logs.mutations.append, {
							agentId,
							type: "tool_result" as const,
							content: `[step] ${tr.toolName} → ${resultStr.slice(0, 500)}`,
						});
					}
				}
			},
		});

		const summary = result.text || "(task completed, no final text)";

		await ctx.runMutation(internal.logs.mutations.append, {
			agentId,
			type: "status" as const,
			content: `[${role}] Task completed`,
		});

		return { success: true, result: summary };
	} catch (error: unknown) {
		// AbortError means we hit the time budget — treat as graceful completion
		if (error instanceof Error && error.name === "AbortError") {
			await ctx.runMutation(internal.logs.mutations.append, {
				agentId,
				type: "status" as const,
				content: `[${role}] Time budget reached — wrapping up`,
			});
			return { success: true, result: "Task completed (time budget reached)" };
		}

		const errorMsg = error instanceof Error ? error.message : String(error);
		await ctx.runMutation(internal.logs.mutations.append, {
			agentId,
			type: "stderr" as const,
			content: `[${role}] Error: ${errorMsg}`,
		});
		return { success: false, result: errorMsg };
	} finally {
		clearTimeout(timer);
	}
}
