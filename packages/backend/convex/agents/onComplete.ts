import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

// Workpool callback: fires after a sub-agent finishes
export const onSubAgentComplete = internalMutation({
	args: {
		agentId: v.id("agents"),
		taskId: v.id("tasks"),
		success: v.boolean(),
		result: v.optional(v.string()),
		error: v.optional(v.string()),
	},
	handler: async (ctx, { agentId, taskId, success, result, error }) => {
		// Update task with result or error
		if (success && result) {
			await ctx.db.patch(taskId, { result });
		}
		if (!success && error) {
			await ctx.db.patch(taskId, { error });
		}

		// Free the desk
		const agent = await ctx.db.get(agentId);
		if (agent?.deskId) {
			await ctx.db.patch(agent.deskId, { occupiedBy: undefined });
		}

		// Stop the agent's sandbox (preserves disk via shared volume)
		await ctx.scheduler.runAfter(0, internal.sandbox.lifecycle.stopAgentSandbox, { agentId });
	},
});
