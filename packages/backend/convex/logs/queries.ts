import { v } from "convex/values";
import { query } from "../_generated/server";

// Stream logs for an agent (real-time via subscription)
export const streamForAgent = query({
	args: {
		agentId: v.id("agents"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, { agentId, limit }) => {
		const q = ctx.db
			.query("agentLogs")
			.withIndex("by_agent_time", (q) => q.eq("agentId", agentId))
			.order("desc");

		if (limit) {
			const logs = await q.take(limit);
			return logs.reverse(); // return in chronological order
		}

		return await q.collect();
	},
});

// Get recent logs across all agents
export const getRecent = query({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, { limit }) => {
		const logs = await ctx.db
			.query("agentLogs")
			.order("desc")
			.take(limit ?? 50);

		return logs.reverse();
	},
});
