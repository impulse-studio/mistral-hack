import { saveMessage } from "@convex-dev/agent";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

const SHARED_THREAD_KEY = "shared-thread-id";

// Workpool callback: fires after a sub-agent finishes
export const onSubAgentComplete = internalMutation({
	args: {
		agentId: v.id("agents"),
		taskId: v.id("tasks"),
		success: v.boolean(),
		result: v.optional(v.string()),
		error: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, { agentId, taskId, success, result, error }) => {
		// Save result/error on the task — always write these fields regardless of
		// current status so the error message is never lost to a race condition.
		const task = await ctx.db.get(taskId);
		if (task) {
			const patch: Record<string, unknown> = {};
			if (result) patch.result = result;
			if (!success && error) patch.error = error;
			if (Object.keys(patch).length > 0) {
				await ctx.db.patch(taskId, patch);
			}
		}

		// Transition agent based on outcome:
		// - Success → idle (keep desk and sandbox warm for mailbox reuse)
		// - Failure → keep "failed" status so the UI reflects it and manager sees it
		const agent = await ctx.db.get(agentId);
		if (agent && agent.status !== "despawning") {
			if (success) {
				// Go idle — ready for follow-up work via mailbox
				if (agent.status !== "idle") {
					await ctx.db.patch(agentId, {
						status: "idle",
						currentTaskId: undefined,
						completedAt: Date.now(),
					});
				}
			} else {
				// Stay failed — clear task assignment but preserve failure state
				await ctx.db.patch(agentId, {
					status: "failed",
					currentTaskId: undefined,
					completedAt: Date.now(),
				});
			}
		}

		// Schedule mailbox check only on success — failed agents shouldn't pick up new work
		if (success) {
			await ctx.scheduler.runAfter(0, internal.mailbox.process.processMailbox, { agentId });
		}

		// Build notification message for the manager
		const agentName = agent?.name ?? "Unknown";
		const agentRole = agent?.role ?? "worker";
		const taskTitle = task?.title ?? "Unknown task";
		const statusLabel = success ? "SUCCESS" : "FAILED";
		const detail = success
			? (result ?? "No details").slice(0, 500)
			: (error ?? "No error details").slice(0, 500);
		const notification = `[WORKER COMPLETE] Agent "${agentName}" (${agentRole}) finished task "${taskTitle}". Status: ${statusLabel}. Result: ${detail}`;

		// Get the shared thread + manager agent
		const threadConfig = await ctx.db
			.query("systemConfig")
			.withIndex("by_key", (q) => q.eq("key", SHARED_THREAD_KEY))
			.first();
		const threadId = threadConfig?.value ?? null;
		const manager = await ctx.db
			.query("agents")
			.withIndex("by_type", (q) => q.eq("type", "manager"))
			.first();

		if (threadId && manager) {
			// Save notification to thread (for manager's conversation context)
			const { messageId } = await saveMessage(ctx, components.agent, {
				threadId,
				prompt: notification,
			});

			// Enqueue to manager's mailbox at normal priority
			await ctx.scheduler.runAfter(0, internal.mailbox.mutations.enqueue, {
				recipientId: manager._id,
				senderId: agentId,
				type: "notification" as const,
				payload: notification,
				taskId,
				priority: 0,
				threadMessageId: messageId,
			});
		}

		// Check for tasks blocked by this completed task
		if (success && task && threadId && manager) {
			const backlogTasks = await ctx.db
				.query("tasks")
				.withIndex("by_status", (q) => q.eq("status", "backlog"))
				.collect();
			const todoTasks = await ctx.db
				.query("tasks")
				.withIndex("by_status", (q) => q.eq("status", "todo"))
				.collect();
			const candidates = [...backlogTasks, ...todoTasks];
			for (const blockedTask of candidates) {
				if (!blockedTask.dependsOn || blockedTask.dependsOn.length === 0) continue;
				if (!blockedTask.dependsOn.includes(taskId)) continue;
				let allDone = true;
				for (const depId of blockedTask.dependsOn) {
					if (depId === taskId) continue;
					const dep = await ctx.db.get(depId);
					if (!dep || dep.status !== "done") {
						allDone = false;
						break;
					}
				}
				if (allDone) {
					const depNotification = `[DEPENDENCY RESOLVED] Task "${blockedTask.title}" (${blockedTask._id}) is now unblocked — all dependencies satisfied. You can spawn an agent for it.`;
					const { messageId: depMsgId } = await saveMessage(ctx, components.agent, {
						threadId,
						prompt: depNotification,
					});
					await ctx.scheduler.runAfter(0, internal.mailbox.mutations.enqueue, {
						recipientId: manager._id,
						type: "notification" as const,
						payload: depNotification,
						priority: 0,
						threadMessageId: depMsgId,
					});
				}
			}
		}
	},
});

/** Save notification to manager's thread and schedule the action to wake the manager.
 * @deprecated — Use mailbox enqueue instead. Kept for backward compat. */
export const notifyManagerMutation = internalMutation({
	args: {
		threadId: v.string(),
		notification: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, { threadId, notification }) => {
		const { messageId } = await saveMessage(ctx, components.agent, {
			threadId,
			prompt: notification,
		});
		await ctx.scheduler.runAfter(0, internal.agents.onCompleteActions.notifyManagerAction, {
			threadId,
			promptMessageId: messageId,
		});
	},
});
