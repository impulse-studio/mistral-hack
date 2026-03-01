import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { taskDoc, taskStatusValidator } from "../schema";

export const list = query({
	args: {
		status: v.optional(taskStatusValidator),
	},
	returns: v.array(taskDoc),
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
	returns: v.union(taskDoc, v.null()),
	handler: async (ctx, { taskId }) => {
		return await ctx.db.get(taskId);
	},
});

// Internal version for use by actions
export const getInternal = internalQuery({
	args: { taskId: v.id("tasks") },
	returns: v.union(taskDoc, v.null()),
	handler: async (ctx, { taskId }) => {
		return await ctx.db.get(taskId);
	},
});

export const listByAgent = query({
	args: { agentId: v.id("agents") },
	returns: v.array(taskDoc),
	handler: async (ctx, { agentId }) => {
		return await ctx.db
			.query("tasks")
			.withIndex("by_assignedTo", (q) => q.eq("assignedTo", agentId))
			.collect();
	},
});

export const listSubTasks = query({
	args: { parentTaskId: v.id("tasks") },
	returns: v.array(taskDoc),
	handler: async (ctx, { parentTaskId }) => {
		return await ctx.db
			.query("tasks")
			.withIndex("by_parent", (q) => q.eq("parentTaskId", parentTaskId))
			.collect();
	},
});

// Resolve an array of task references (IDs or titles) into valid task IDs.
// Silently skips refs that can't be resolved.
export const resolveTaskRefs = internalQuery({
	args: { refs: v.array(v.string()) },
	returns: v.array(v.id("tasks")),
	handler: async (ctx, { refs }) => {
		const resolved: Id<"tasks">[] = [];
		for (const ref of refs) {
			// Try as direct Convex ID first
			const normalized = ctx.db.normalizeId("tasks", ref);
			if (normalized) {
				const task = await ctx.db.get(normalized);
				if (task) {
					resolved.push(normalized);
					continue;
				}
			}
			// Try exact title match
			const byTitle = await ctx.db
				.query("tasks")
				.filter((q) => q.eq(q.field("title"), ref))
				.first();
			if (byTitle) {
				resolved.push(byTitle._id);
			}
		}
		return resolved;
	},
});

export const getKanban = query({
	args: {},
	returns: v.object({
		backlog: v.array(taskDoc),
		todo: v.array(taskDoc),
		waiting: v.array(taskDoc),
		in_progress: v.array(taskDoc),
		review: v.array(taskDoc),
		done: v.array(taskDoc),
		failed: v.array(taskDoc),
	}),
	handler: async (ctx) => {
		const all = await ctx.db.query("tasks").collect();
		const kanban = {
			backlog: [] as typeof all,
			todo: [] as typeof all,
			waiting: [] as typeof all,
			in_progress: [] as typeof all,
			review: [] as typeof all,
			done: [] as typeof all,
			failed: [] as typeof all,
		};
		for (const task of all) {
			kanban[task.status].push(task);
		}
		return kanban;
	},
});
