import { v } from "convex/values";
import { query } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

async function resolveScreenshotUrls(ctx: QueryCtx, logs: Doc<"agentLogs">[]) {
	return Promise.all(
		logs.map(async (log) => {
			if (log.screenshotId) {
				const screenshotUrl = await ctx.storage.getUrl(log.screenshotId);
				return { ...log, screenshotUrl };
			}
			return { ...log, screenshotUrl: null };
		}),
	);
}

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

		const logs = limit !== undefined ? await q.take(limit) : await q.collect();
		const resolved = await resolveScreenshotUrls(ctx, logs);
		return resolved.reverse(); // return in chronological order
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

		const resolved = await resolveScreenshotUrls(ctx, logs);
		return resolved.reverse();
	},
});
