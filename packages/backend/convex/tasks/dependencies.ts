import { v } from "convex/values";
import { query } from "../_generated/server";

// Check whether a task's dependencies are all satisfied
export const canStart = query({
	args: { taskId: v.id("tasks") },
	returns: v.boolean(),
	handler: async (ctx, { taskId }) => {
		const task = await ctx.db.get(taskId);
		if (!task?.dependsOn?.length) return true;

		for (const depId of task.dependsOn) {
			const dep = await ctx.db.get(depId);
			if (!dep || dep.status !== "done") return false;
		}
		return true;
	},
});
