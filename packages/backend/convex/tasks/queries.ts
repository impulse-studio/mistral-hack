import { v } from "convex/values";
import { query } from "../_generated/server";
import { taskStatusValidator } from "../schema";

export const list = query({
	args: {
		status: v.optional(taskStatusValidator),
	},
	handler: async (ctx, { status }) => {
		if (status) {
			return await ctx.db
				.query("tasks")
				.withIndex("by_status", (q) => q.eq("status", status))
				.collect();
		}
		return await ctx.db.query("tasks").collect();
	},
});

export const get = query({
	args: { taskId: v.id("tasks") },
	handler: async (ctx, { taskId }) => {
		return await ctx.db.get(taskId);
	},
});

export const listByAgent = query({
	args: { agentId: v.id("agents") },
	handler: async (ctx, { agentId }) => {
		return await ctx.db
			.query("tasks")
			.withIndex("by_assignedTo", (q) => q.eq("assignedTo", agentId))
			.collect();
	},
});

export const listSubTasks = query({
	args: { parentTaskId: v.id("tasks") },
	handler: async (ctx, { parentTaskId }) => {
		return await ctx.db
			.query("tasks")
			.withIndex("by_parent", (q) => q.eq("parentTaskId", parentTaskId))
			.collect();
	},
});

export const getKanban = query({
	args: {},
	handler: async (ctx) => {
		const all = await ctx.db.query("tasks").collect();
		const kanban: Record<string, typeof all> = {
			backlog: [],
			todo: [],
			in_progress: [],
			review: [],
			done: [],
			failed: [],
		};
		for (const task of all) {
			kanban[task.status]!.push(task);
		}
		return kanban;
	},
});
