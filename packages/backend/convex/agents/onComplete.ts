import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

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

		// TODO: notify Manager thread about completion
		// This would send a message to the Manager's durable agent thread
		// so it can decide what to do next
	},
});
