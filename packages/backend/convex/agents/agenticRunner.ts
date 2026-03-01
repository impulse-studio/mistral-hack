import { generateText } from "ai";
import { internal } from "../_generated/api";
import { mistral, MANAGER_MODEL } from "./models";
import { buildSkillset } from "./skills/index";
import { buildSystemPrompt } from "./prompts";
import type { RunnerCtx, RunnerResult } from "./shared/types";

const SOFT_BUDGET_MS = 500_000; // ~8.3 min — clean exit via stopWhen, leaves room for continuation save
const HARD_BUDGET_MS = 560_000; // ~9.3 min — AbortController safety net for runaway single tool calls
const MAX_STEPS = 50;
const MAX_CONTINUATIONS = 3; // Hard cap: max 4 total runs (~36 min)

export type ContinuationState = {
	messages: string; // JSON-serialized Array<ResponseMessage>
	stepsCompleted: number;
	continuationCount: number;
};

/**
 * Unified agentic runner — ReAct loop via AI SDK generateText + skills.
 * Supports continuation: if the time budget is hit, returns partial state
 * that can be resumed in a follow-up action.
 */
export async function runAgenticTask(
	ctx: RunnerCtx,
	agentId: string,
	task: { title: string; description?: string },
	role: string,
	agentName: string,
	continuationState?: ContinuationState,
): Promise<RunnerResult> {
	const tools = buildSkillset(ctx, agentId, role);
	const systemPrompt = buildSystemPrompt(role, task, agentName);
	const startTime = Date.now();
	const stepsAlreadyDone = continuationState?.stepsCompleted ?? 0;
	const currentContinuation = continuationState?.continuationCount ?? 0;

	const runLabel = continuationState
		? `(continuation ${currentContinuation}/${MAX_CONTINUATIONS})`
		: "";

	await ctx.runMutation(internal.logs.mutations.append, {
		agentId,
		type: "status" as const,
		content: `[${role}] ${continuationState ? "Resuming" : "Starting"} agentic task: ${task.title} ${runLabel}`,
	});

	// Accumulator for hard-abort fallback — captures messages incrementally
	// so even a hard abort preserves prior steps for continuation
	const accumulatedMessages: unknown[] = [];

	// Dual timeout strategy:
	// 1. Soft budget (stopWhen) — clean exit with full result object
	// 2. Hard safety net (AbortController) — catches runaway single tool calls
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), HARD_BUDGET_MS);

	// Shared generateText options (everything except prompt/messages)
	const stopWhen = ({ steps }: { steps: unknown[] }) => {
		if (steps.length + stepsAlreadyDone >= MAX_STEPS) return true;
		return Date.now() - startTime > SOFT_BUDGET_MS;
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const onStepFinish = async (event: any) => {
		// Accumulate messages for hard-abort fallback
		if (event.response?.messages) {
			accumulatedMessages.push(...event.response.messages);
		}

		// Build a batch of log entries for this step
		const entries: Array<{
			type: "reasoning" | "assistant_text" | "usage" | "tool_call" | "tool_result";
			content: string;
		}> = [];

		// 1. Reasoning (extended thinking from Magistral models)
		if (event.reasoningText) {
			entries.push({ type: "reasoning", content: event.reasoningText });
		}

		// 2. Assistant text (model's response between tool calls)
		if (event.text) {
			entries.push({ type: "assistant_text", content: event.text });
		}

		// 3. Usage (token counts + metadata)
		if (event.usage) {
			entries.push({
				type: "usage",
				content: JSON.stringify({
					step: event.stepNumber ?? null,
					inputTokens: event.usage.inputTokens ?? 0,
					outputTokens: event.usage.outputTokens ?? 0,
					reasoningTokens: event.usage.outputTokenDetails?.reasoningTokens ?? 0,
					totalTokens: event.usage.totalTokens ?? 0,
					finishReason: event.finishReason ?? null,
				}),
			});
		}

		// 4. Tool calls
		for (const tc of event.staticToolCalls) {
			entries.push({
				type: "tool_call",
				content: `[step] ${tc.toolName}(${JSON.stringify(tc.input).slice(0, 300)})`,
			});
		}

		// 5. Tool results
		for (const tr of event.staticToolResults) {
			const resultStr = typeof tr.output === "string" ? tr.output : JSON.stringify(tr.output);
			entries.push({
				type: "tool_result",
				content: `[step] ${tr.toolName} → ${resultStr.slice(0, 500)}`,
			});
		}

		// Batch-write all entries in one mutation (preserves ordering via timestamp+i)
		if (entries.length > 0) {
			await ctx.runMutation(internal.logs.mutations.appendBatch, {
				agentId,
				entries,
			});
		}
	};

	try {
		const taskPrompt = `Execute this task now:\n\n**${task.title}**\n${task.description ?? ""}`;

		// Use separate generateText calls to satisfy TypeScript's discriminated union
		// (prompt and messages are mutually exclusive)
		const result = continuationState
			? await generateText({
					model: mistral(MANAGER_MODEL),
					system: systemPrompt,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					messages: [
						{ role: "user" as const, content: taskPrompt },
						// ResponseMessages from prior run — already correctly shaped from AI SDK
						...(JSON.parse(continuationState.messages) as any[]),
						{
							role: "user" as const,
							content:
								"Continue working. You were interrupted by a time limit. Resume from where you stopped. Do NOT repeat work already done — review the tool results above and continue from the last step.",
						},
					],
					tools,
					stopWhen,
					abortSignal: controller.signal,
					onStepFinish,
				})
			: await generateText({
					model: mistral(MANAGER_MODEL),
					system: systemPrompt,
					prompt: taskPrompt,
					tools,
					stopWhen,
					abortSignal: controller.signal,
					onStepFinish,
				});

		// Check if stopped by time budget (not natural completion)
		const hitBudget = Date.now() - startTime > SOFT_BUDGET_MS;
		const hitStepLimit = result.steps.length + stepsAlreadyDone >= MAX_STEPS;
		const canContinue = currentContinuation < MAX_CONTINUATIONS;

		if ((hitBudget || hitStepLimit) && canContinue) {
			await ctx.runMutation(internal.logs.mutations.append, {
				agentId,
				type: "status" as const,
				content: `[${role}] Time/step budget reached — scheduling continuation ${currentContinuation + 1}/${MAX_CONTINUATIONS}`,
			});

			return {
				success: false,
				result: "Time budget reached. Continuation scheduled.",
				continuation: {
					messages: JSON.stringify(result.response.messages),
					stepsCompleted: stepsAlreadyDone + result.steps.length,
					continuationCount: currentContinuation + 1,
				},
			};
		}

		const summary = result.text || "(task completed, no final text)";

		await ctx.runMutation(internal.logs.mutations.append, {
			agentId,
			type: "status" as const,
			content: `[${role}] Task completed`,
		});

		return { success: true, result: summary };
	} catch (error: unknown) {
		// AbortError means the hard safety net fired
		if (error instanceof Error && error.name === "AbortError") {
			const canContinue = currentContinuation < MAX_CONTINUATIONS;

			// If we have accumulated messages and can continue, schedule continuation
			if (accumulatedMessages.length > 0 && canContinue) {
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "status" as const,
					content: `[${role}] Hard timeout — using accumulated messages for continuation ${currentContinuation + 1}/${MAX_CONTINUATIONS}`,
				});

				return {
					success: false,
					result: "Hard timeout reached. Continuation scheduled from accumulated state.",
					continuation: {
						messages: JSON.stringify(accumulatedMessages),
						stepsCompleted: stepsAlreadyDone + accumulatedMessages.length,
						continuationCount: currentContinuation + 1,
					},
				};
			}

			// No accumulated messages or hit max continuations — genuine failure
			await ctx.runMutation(internal.logs.mutations.append, {
				agentId,
				type: "stderr" as const,
				content: `[${role}] Task timed out after ${HARD_BUDGET_MS / 1000}s — ${canContinue ? "no messages to continue from" : "max continuations reached"}`,
			});
			return {
				success: false,
				result: `Task timed out after ${HARD_BUDGET_MS / 1000}s. The agent ran out of time before completing the task.`,
			};
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
