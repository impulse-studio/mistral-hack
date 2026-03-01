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
		// Update task with result or error (idempotent: check current state first)
		const task = await ctx.db.get(taskId);
		if (task && task.status !== "done" && task.status !== "failed") {
			if (success && result) {
				await ctx.db.patch(taskId, { result });
			}
			if (!success && error) {
				await ctx.db.patch(taskId, { error });
			}
		}

		// Transition agent to idle — keep desk and sandbox warm for mailbox reuse
		const agent = await ctx.db.get(agentId);
		if (agent && agent.status !== "despawning" && agent.status !== "idle") {
			await ctx.db.patch(agentId, {
				status: "idle",
				currentTaskId: undefined,
				completedAt: Date.now(),
			});
		}

		// Schedule mailbox check — agent may have queued follow-up work
		await ctx.scheduler.runAfter(0, internal.mailbox.process.processMailbox, { agentId });

		// Build notification message for the manager
		const agentName = agent?.name ?? "Unknown";
		const agentRole = agent?.role ?? "worker";
		const taskTitle = task?.title ?? "Unknown task";
		const statusLabel = success ? "SUCCESS" : "FAILED";
		const detail = success
			? (result ?? "No details").slice(0, 500)
			: (error ?? "No error details").slice(0, 500);
		const notification = `[WORKER COMPLETE] Agent "${agentName}" (${agentRole}) finished task "${taskTitle}". Status: ${statusLabel}. Result: ${detail}`;

		// Save system message for UI visibility
		await ctx.db.insert("messages", {
			content: notification,
			role: "system",
			channel: "web",
			agentId,
			taskId,
			createdAt: Date.now(),
		});

		// Get the shared thread from systemConfig (not the agent's threadId)
		const threadConfig = await ctx.db
			.query("systemConfig")
			.withIndex("by_key", (q) => q.eq("key", SHARED_THREAD_KEY))
			.first();
		const threadId = threadConfig?.value ?? null;
		if (threadId) {
			await ctx.scheduler.runAfter(0, internal.agents.onComplete.notifyManagerMutation, {
				threadId,
				notification,
			});
		}

		// Check for tasks blocked by this completed task
		// Scan both "backlog" and "todo" — tasks with deps may sit in either status
		if (success && task) {
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
				// Check if all dependencies are done
				let allDone = true;
				for (const depId of blockedTask.dependsOn) {
					if (depId === taskId) continue; // just completed
					const dep = await ctx.db.get(depId);
					if (!dep || dep.status !== "done") {
						allDone = false;
						break;
					}
				}
				if (allDone && threadId) {
					const depNotification = `[DEPENDENCY RESOLVED] Task "${blockedTask.title}" (${blockedTask._id}) is now unblocked — all dependencies satisfied. You can spawn an agent for it.`;
					await ctx.scheduler.runAfter(0, internal.agents.onComplete.notifyManagerMutation, {
						threadId,
						notification: depNotification,
					});
				}
			}
		}
	},
});

/** Save notification to manager's thread and schedule the action to wake the manager */
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
