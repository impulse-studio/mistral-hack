import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { logTypeValidator } from "../schema";

// Get recent agent logs for progress checking
export const getRecentLogs = internalQuery({
	args: {
		agentId: v.id("agents"),
		limit: v.number(),
	},
	returns: v.array(
		v.object({
			type: logTypeValidator,
			content: v.string(),
			timestamp: v.number(),
		}),
	),
	handler: async (ctx, { agentId, limit }) => {
		const logs = await ctx.db
			.query("agentLogs")
			.withIndex("by_agent_time", (q) => q.eq("agentId", agentId))
			.order("desc")
			.take(limit);

		return logs.map((l) => ({
			type: l.type,
			content: l.content,
			timestamp: l.timestamp,
		}));
	},
});
