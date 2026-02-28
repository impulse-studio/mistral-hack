import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { taskStatusValidator } from "../schema";

export const create = mutation({
	args: {
		title: v.string(),
		description: v.optional(v.string()),
		createdBy: v.union(v.literal("user"), v.literal("manager")),
		parentTaskId: v.optional(v.id("tasks")),
		dependsOn: v.optional(v.array(v.id("tasks"))),
		estimatedMinutes: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("tasks", {
			...args,
			status: "backlog",
			createdAt: Date.now(),
		});
	},
});

export const updateStatus = mutation({
	args: {
		taskId: v.id("tasks"),
		status: taskStatusValidator,
	},
	handler: async (ctx, { taskId, status }) => {
		const now = Date.now();
		const patch: Record<string, unknown> = { status };

		if (status === "in_progress") {
			patch.startedAt = now;
		} else if (status === "done" || status === "failed") {
			patch.completedAt = now;
		}

		await ctx.db.patch(taskId, patch);
	},
});

export const assign = mutation({
	args: {
		taskId: v.id("tasks"),
		agentId: v.id("agents"),
	},
	handler: async (ctx, { taskId, agentId }) => {
		await ctx.db.patch(taskId, {
			assignedTo: agentId,
			status: "todo",
		});
		await ctx.db.patch(agentId, {
			currentTaskId: taskId,
		});
	},
});

export const complete = internalMutation({
	args: {
		taskId: v.id("tasks"),
		result: v.optional(v.string()),
		error: v.optional(v.string()),
	},
	handler: async (ctx, { taskId, result, error }) => {
		const status = error ? "failed" : "done";
		await ctx.db.patch(taskId, {
			status,
			result,
			error,
			completedAt: Date.now(),
		});

		// Unassign the agent
		const task = await ctx.db.get(taskId);
		if (task?.assignedTo) {
			await ctx.db.patch(task.assignedTo, {
				currentTaskId: undefined,
				status: error ? "failed" : "completed",
				completedAt: Date.now(),
			});
		}
	},
});

export const update = mutation({
	args: {
		taskId: v.id("tasks"),
		title: v.optional(v.string()),
		description: v.optional(v.string()),
		estimatedMinutes: v.optional(v.number()),
	},
	handler: async (ctx, { taskId, ...fields }) => {
		const patch: Record<string, unknown> = {};
		if (fields.title !== undefined) patch.title = fields.title;
		if (fields.description !== undefined) patch.description = fields.description;
		if (fields.estimatedMinutes !== undefined) patch.estimatedMinutes = fields.estimatedMinutes;

		if (Object.keys(patch).length > 0) {
			await ctx.db.patch(taskId, patch);
		}
	},
});

export const remove = mutation({
	args: { taskId: v.id("tasks") },
	handler: async (ctx, { taskId }) => {
		await ctx.db.delete(taskId);
	},
});

// Internal versions for use by agent tools (actions can't call public mutations)
export const createInternal = internalMutation({
	args: {
		title: v.string(),
		description: v.optional(v.string()),
		createdBy: v.union(v.literal("user"), v.literal("manager")),
		estimatedMinutes: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("tasks", {
			...args,
			status: "backlog",
			createdAt: Date.now(),
		});
	},
});

export const updateStatusInternal = internalMutation({
	args: {
		taskId: v.id("tasks"),
		status: taskStatusValidator,
	},
	handler: async (ctx, { taskId, status }) => {
		const now = Date.now();
		const patch: Record<string, unknown> = { status };

		if (status === "in_progress") {
			patch.startedAt = now;
		} else if (status === "done" || status === "failed") {
			patch.completedAt = now;
		}

		await ctx.db.patch(taskId, patch);
	},
});
