import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { taskCommentAuthorValidator, taskCommentDoc } from "../schema";

export const add = mutation({
	args: {
		taskId: v.id("tasks"),
		content: v.string(),
		author: taskCommentAuthorValidator,
		agentId: v.optional(v.id("agents")),
	},
	returns: v.id("taskComments"),
	handler: async (ctx, args) => {
		const task = await ctx.db.get(args.taskId);
		if (!task) throw new Error(`Task ${args.taskId} not found`);

		const commentId = await ctx.db.insert("taskComments", {
			...args,
			createdAt: Date.now(),
		});

		// Auto-notify agents via mailbox when a user or system comments
		if (args.author === "user" || args.author === "system") {
			const payload = `[COMMENT on "${task.title}"] ${args.content}`;

			if (task.status === "done" || task.status === "waiting") {
				// Finished/waiting tasks → low-priority background notification to manager
				const manager = await ctx.db
					.query("agents")
					.withIndex("by_type", (q) => q.eq("type", "manager"))
					.first();
				if (manager) {
					await ctx.scheduler.runAfter(0, internal.mailbox.mutations.enqueue, {
						recipientId: manager._id,
						type: "notification" as const,
						payload,
						taskId: args.taskId,
						priority: -1,
					});
				}
			} else if (task.status === "in_progress" && task.assignedTo) {
				// Active task → normal-priority notification to the working agent
				await ctx.scheduler.runAfter(0, internal.mailbox.mutations.enqueue, {
					recipientId: task.assignedTo,
					type: "notification" as const,
					payload,
					taskId: args.taskId,
					priority: 0,
				});
			} else {
				// backlog, todo, review, failed → notify manager at normal priority
				const manager = await ctx.db
					.query("agents")
					.withIndex("by_type", (q) => q.eq("type", "manager"))
					.first();
				if (manager) {
					await ctx.scheduler.runAfter(0, internal.mailbox.mutations.enqueue, {
						recipientId: manager._id,
						type: "notification" as const,
						payload,
						taskId: args.taskId,
						priority: 0,
					});
				}
			}
		}

		return commentId;
	},
});

export const addInternal = internalMutation({
	args: {
		taskId: v.id("tasks"),
		content: v.string(),
		author: taskCommentAuthorValidator,
		agentId: v.optional(v.id("agents")),
	},
	returns: v.id("taskComments"),
	handler: async (ctx, args) => {
		return await ctx.db.insert("taskComments", {
			...args,
			createdAt: Date.now(),
		});
	},
});

export const listByTask = query({
	args: { taskId: v.id("tasks") },
	returns: v.array(taskCommentDoc),
	handler: async (ctx, { taskId }) => {
		return await ctx.db
			.query("taskComments")
			.withIndex("by_task_time", (q) => q.eq("taskId", taskId))
			.collect();
	},
});
