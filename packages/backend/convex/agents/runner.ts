"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { runComputerUseTask } from "./browser/runner";
import { runAgenticTask } from "./agenticRunner";
import type { ContinuationState } from "./agenticRunner";
import { roleHas } from "./shared/capabilities";
import type { RunnerResult } from "./shared/types";

// Sub-agent runner — executed by the workpool for each sub-agent
export const runSubAgent = internalAction({
	args: {
		agentId: v.id("agents"),
		taskId: v.id("tasks"),
	},
	handler: async (
		ctx,
		{ agentId, taskId },
	): Promise<{ success: boolean; result?: string; error?: string }> => {
		// 1. Get records
		const agent = await ctx.runQuery(internal.office.queries.getAgentInternal, { agentId });
		const task = await ctx.runQuery(internal.tasks.queries.getInternal, {
			taskId,
		});
		if (!agent || !task) throw new Error("Agent or task not found");

		// 1b. Dependency guard — prevent execution if deps are unmet
		const depCheck = await ctx.runQuery(internal.tasks.dependencies.canStartInternal, {
			taskId,
		});
		if (!depCheck.canStart) {
			const names = depCheck.unmet
				.map((d: { title: string; status: string }) => `"${d.title}" (${d.status})`)
				.join(", ");
			const errorMsg = `Cannot start task "${task.title}" — unmet dependencies: ${names}`;
			await ctx.runMutation(internal.tasks.mutations.updateStatusInternal, {
				taskId,
				status: "failed",
			});
			await ctx.runMutation(internal.office.mutations.updateAgentStatus, {
				agentId,
				status: "failed",
			});
			await ctx.runMutation(internal.logs.mutations.append, {
				agentId,
				type: "stderr" as const,
				content: errorMsg,
			});
			await ctx.runMutation(internal.agents.onComplete.onSubAgentComplete, {
				agentId,
				taskId,
				success: false,
				error: errorMsg,
			});
			return { success: false, error: errorMsg };
		}

		// 2. Update statuses (idempotent — safe for continuation re-entry)
		await ctx.runMutation(internal.office.mutations.updateAgentStatus, {
			agentId,
			status: "working",
			reasoning: `Working on: ${task.title}`,
		});
		await ctx.runMutation(internal.tasks.mutations.updateStatusInternal, {
			taskId,
			status: "in_progress",
		});

		// Log start
		await ctx.runMutation(internal.logs.mutations.append, {
			agentId,
			type: "status",
			content: `Starting task: ${task.title}`,
		});

		try {
			// Build env vars based on role capabilities
			const envVars: Record<string, string> = {};
			const mistralKey = process.env.MISTRAL_API_KEY;
			if (mistralKey) envVars.MISTRAL_API_KEY = mistralKey;
			if (roleHas(agent.role, "git") || roleHas(agent.role, "github")) {
				const ghToken = process.env.GITHUB_TOKEN;
				if (ghToken) envVars.GITHUB_TOKEN = ghToken;
			}
			if (roleHas(agent.role, "deploy")) {
				const vercelToken = process.env.VERCEL_TOKEN;
				if (vercelToken) envVars.VERCEL_TOKEN = vercelToken;
			}

			// Ensure per-agent sandbox is running (creates one if needed, with shared volume)
			await ctx.runAction(internal.sandbox.lifecycle.ensureRunning, {
				agentId,
				name: agent.name,
				envVars: Object.keys(envVars).length > 0 ? envVars : undefined,
			});

			// Load existing continuation state (if this is a resumed run)
			const continuation = await ctx.runQuery(internal.agents.continuations.getLatest, { taskId });
			const continuationState: ContinuationState | undefined = continuation
				? {
						messages: continuation.messages,
						stepsCompleted: continuation.stepsCompleted,
						continuationCount: continuation.continuationCount,
					}
				: undefined;

			// Dispatch: browser/designer use vision-action loop, all others use agentic runner
			let outcome: RunnerResult;
			if (agent.role === "browser" || agent.role === "designer") {
				outcome = await runComputerUseTask(ctx, agentId, task);
			} else {
				outcome = await runAgenticTask(
					ctx,
					agentId,
					task,
					agent.role,
					agent.name,
					continuationState,
				);
			}

			// ── Continuation handling ──
			// If the runner returned continuation data, persist state and schedule next run.
			// Do NOT call onSubAgentComplete — task is still in progress.
			if (outcome.continuation) {
				await ctx.runMutation(internal.agents.continuations.save, {
					agentId,
					taskId,
					messages: outcome.continuation.messages,
					stepsCompleted: outcome.continuation.stepsCompleted,
					continuationCount: outcome.continuation.continuationCount,
				});
				await ctx.runMutation(internal.agents.continuations.scheduleContinuation, {
					agentId,
					taskId,
				});
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "status",
					content: `Task continuing (run ${outcome.continuation.continuationCount + 1}/4)...`,
				});
				// Agent stays "working", task stays "in_progress"
				return { success: true, result: "continuation scheduled" };
			}

			// ── Normal completion ──
			// Clean up any leftover continuation record
			await ctx.runMutation(internal.agents.continuations.cleanup, { taskId });

			const { success: taskSuccess, result } = outcome;
			const finalStatus = taskSuccess ? "done" : "failed";

			await ctx.runMutation(internal.tasks.mutations.updateStatusInternal, {
				taskId,
				status: finalStatus,
			});

			// Log completion
			await ctx.runMutation(internal.logs.mutations.append, {
				agentId,
				type: taskSuccess ? "status" : "stderr",
				content: taskSuccess
					? `Task completed: ${task.title}`
					: `Task finished with failures: ${task.title}`,
			});

			if (!taskSuccess) {
				await ctx.runMutation(internal.office.mutations.updateAgentStatus, {
					agentId,
					status: "failed",
				});
			}

			// Notify completion handler
			await ctx.runMutation(internal.agents.onComplete.onSubAgentComplete, {
				agentId,
				taskId,
				success: taskSuccess,
				...(taskSuccess ? { result } : { result, error: result }),
			});

			return { success: taskSuccess, result };
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);

			// Clean up continuation on unrecoverable errors
			await ctx.runMutation(internal.agents.continuations.cleanup, { taskId });

			await ctx.runMutation(internal.tasks.mutations.updateStatusInternal, {
				taskId,
				status: "failed",
			});
			await ctx.runMutation(internal.office.mutations.updateAgentStatus, {
				agentId,
				status: "failed",
			});
			await ctx.runMutation(internal.logs.mutations.append, {
				agentId,
				type: "stderr",
				content: `ERROR: ${errorMsg}`,
			});

			// Notify completion handler
			await ctx.runMutation(internal.agents.onComplete.onSubAgentComplete, {
				agentId,
				taskId,
				success: false,
				error: errorMsg,
			});

			return { success: false, error: errorMsg };
		}
	},
});
