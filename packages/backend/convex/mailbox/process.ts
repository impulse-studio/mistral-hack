"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { agentPool } from "../workpool";

const IDLE_TIMEOUT_MS = 60_000; // 60 seconds

// Process the next message in an agent's mailbox
export const processMailbox = internalAction({
	args: { agentId: v.id("agents") },
	returns: v.null(),
	handler: async (ctx, { agentId }) => {
		// Dequeue the oldest pending message
		const messageId = await ctx.runMutation(internal.mailbox.mutations.dequeue, {
			agentId,
		});

		if (!messageId) {
			// Queue empty → schedule idle timeout check
			await ctx.scheduler.runAfter(IDLE_TIMEOUT_MS, internal.mailbox.process.idleTimeoutCheck, {
				agentId,
			});
			return null;
		}

		// Fetch the message
		const message = await ctx.runQuery(internal.mailbox.queries.getInternal, {
			messageId,
		});
		if (!message) {
			// Message disappeared — try next
			await ctx.scheduler.runAfter(0, internal.mailbox.process.processMailbox, { agentId });
			return null;
		}

		let success = true;

		try {
			switch (message.type) {
				case "task": {
					// Assign task and enqueue on workpool
					if (!message.taskId) {
						throw new Error("Task message missing taskId");
					}
					await ctx.runMutation(internal.tasks.mutations.assignInternal, {
						taskId: message.taskId,
						agentId,
					});
					await agentPool.enqueueAction(ctx, internal.agents.runner.runSubAgent, {
						agentId,
						taskId: message.taskId,
					});
					break;
				}
				case "directive": {
					// If the agent has a waiting task, resume it
					if (message.taskId) {
						const task = await ctx.runQuery(internal.tasks.queries.getInternal, {
							taskId: message.taskId,
						});
						if (task?.status === "waiting") {
							await ctx.runMutation(internal.tasks.mutations.updateStatusInternal, {
								taskId: message.taskId,
								status: "in_progress",
							});
						}
					}
					// Log the directive
					await ctx.runMutation(internal.logs.mutations.append, {
						agentId,
						type: "status" as const,
						content: `[DIRECTIVE] ${message.payload}`,
					});
					break;
				}
				case "notification": {
					// Log the notification
					await ctx.runMutation(internal.logs.mutations.append, {
						agentId,
						type: "status" as const,
						content: `[NOTIFICATION] ${message.payload}`,
					});

					// If this is a worker agent with a task-linked notification (user comment),
					// trigger the agent LLM to respond or escalate
					if (message.taskId) {
						const agent = await ctx.runQuery(internal.office.queries.getAgentInternal, { agentId });
						if (agent && agent.type === "worker") {
							await ctx.scheduler.runAfter(0, internal.agents.respondToComment.respondToComment, {
								agentId,
								taskId: message.taskId,
								commentPayload: message.payload,
							});
						}
					}
					break;
				}
				case "result": {
					// Log the forwarded result
					await ctx.runMutation(internal.logs.mutations.append, {
						agentId,
						type: "status" as const,
						content: `[RESULT] ${message.payload}`,
					});
					break;
				}
			}
		} catch (err) {
			success = false;
			const errMsg = err instanceof Error ? err.message : String(err);
			await ctx.runMutation(internal.logs.mutations.append, {
				agentId,
				type: "stderr" as const,
				content: `Mailbox processing error: ${errMsg}`,
			});
		}

		// Mark message as done or failed
		await ctx.runMutation(internal.mailbox.mutations.markProcessed, {
			messageId,
			status: success ? "done" : "failed",
		});

		// Continue processing if more messages exist (except for task type,
		// where the runner will handle lifecycle via onComplete)
		if (message.type !== "task") {
			const remaining = await ctx.runQuery(internal.mailbox.queries.countPending, { agentId });
			if (remaining > 0) {
				await ctx.scheduler.runAfter(0, internal.mailbox.process.processMailbox, { agentId });
			} else {
				// Schedule idle timeout
				await ctx.scheduler.runAfter(IDLE_TIMEOUT_MS, internal.mailbox.process.idleTimeoutCheck, {
					agentId,
				});
			}
		}

		return null;
	},
});

// Check if an idle agent should be despawned
export const idleTimeoutCheck = internalAction({
	args: { agentId: v.id("agents") },
	returns: v.null(),
	handler: async (ctx, { agentId }) => {
		// Check for pending messages
		const pendingCount = await ctx.runQuery(internal.mailbox.queries.countPending, {
			agentId,
		});

		if (pendingCount > 0) {
			// Messages arrived — process them instead of despawning
			await ctx.scheduler.runAfter(0, internal.mailbox.process.processMailbox, { agentId });
			return null;
		}

		// Check agent is still idle or failed (both should be cleaned up)
		const agent = await ctx.runQuery(internal.office.queries.getAgentInternal, {
			agentId,
		});
		if (!agent || (agent.status !== "idle" && agent.status !== "failed")) return null;

		// No messages, still idle/failed → despawn
		await ctx.runMutation(internal.office.mutations.despawnAgentInternal, { agentId });
		await ctx.runMutation(internal.mailbox.mutations.deadLetterAll, { agentId });
		await ctx.scheduler.runAfter(0, internal.sandbox.lifecycle.stopAgentSandbox, { agentId });

		return null;
	},
});
