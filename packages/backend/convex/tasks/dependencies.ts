import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import type { DatabaseReader } from "../_generated/server";

// Shared logic: check deps and return unmet list
export async function getUnmetDependencies(
	db: DatabaseReader,
	task: { dependsOn?: Id<"tasks">[] },
): Promise<Array<{ id: Id<"tasks">; title: string; status: string }>> {
	if (!task.dependsOn?.length) return [];

	const unmet: Array<{ id: Id<"tasks">; title: string; status: string }> = [];
	for (const depId of task.dependsOn) {
		const dep = await db.get(depId);
		if (!dep || dep.status !== "done") {
			unmet.push({
				id: depId,
				title: dep?.title ?? "(deleted)",
				status: dep?.status ?? "not_found",
			});
		}
	}
	return unmet;
}

// Check whether a task's dependencies are all satisfied
export const canStart = query({
	args: { taskId: v.id("tasks") },
	returns: v.boolean(),
	handler: async (ctx, { taskId }) => {
		const task = await ctx.db.get(taskId);
		if (!task) return false;
		const unmet = await getUnmetDependencies(ctx.db, task);
		return unmet.length === 0;
	},
});

// Both directions: what this task depends on + what it blocks
const depInfoItem = v.object({
	id: v.id("tasks"),
	title: v.string(),
	status: v.string(),
});

export const getDependencyInfo = query({
	args: { taskId: v.id("tasks") },
	returns: v.object({
		dependsOn: v.array(depInfoItem),
		blocks: v.array(depInfoItem),
	}),
	handler: async (ctx, { taskId }) => {
		const task = await ctx.db.get(taskId);
		if (!task) return { dependsOn: [], blocks: [] };

		// Forward: resolve dependsOn IDs
		const dependsOn: Array<{ id: Id<"tasks">; title: string; status: string }> = [];
		for (const depId of task.dependsOn ?? []) {
			const dep = await ctx.db.get(depId);
			dependsOn.push({
				id: depId,
				title: dep?.title ?? "(deleted)",
				status: dep?.status ?? "not_found",
			});
		}

		// Reverse: find tasks that depend on this one
		const allTasks = await ctx.db.query("tasks").collect();
		const blocks: Array<{ id: Id<"tasks">; title: string; status: string }> = [];
		for (const t of allTasks) {
			if (t.dependsOn?.includes(taskId)) {
				blocks.push({ id: t._id, title: t.title, status: t.status });
			}
		}

		return { dependsOn, blocks };
	},
});

// Internal version for use by actions (runner, tools)
export const canStartInternal = internalQuery({
	args: { taskId: v.id("tasks") },
	returns: v.object({
		canStart: v.boolean(),
		unmet: v.array(
			v.object({
				id: v.id("tasks"),
				title: v.string(),
				status: v.string(),
			}),
		),
	}),
	handler: async (ctx, { taskId }) => {
		const task = await ctx.db.get(taskId);
		if (!task) return { canStart: false, unmet: [] };
		const unmet = await getUnmetDependencies(ctx.db, task);
		return { canStart: unmet.length === 0, unmet };
	},
});
