import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { deliverableDoc } from "../schema";

async function resolveDeliverableUrls(ctx: QueryCtx, deliverables: Doc<"deliverables">[]) {
	return Promise.all(
		deliverables.map(async (d) => {
			if (d.storageId && !d.url) {
				const resolvedUrl = await ctx.storage.getUrl(d.storageId);
				return { ...d, url: resolvedUrl ?? undefined };
			}
			return d;
		}),
	);
}

export const listByAgent = query({
	args: { agentId: v.id("agents") },
	returns: v.array(deliverableDoc),
	handler: async (ctx, { agentId }) => {
		const deliverables = await ctx.db
			.query("deliverables")
			.withIndex("by_agent", (q) => q.eq("agentId", agentId))
			.collect();
		return await resolveDeliverableUrls(ctx, deliverables);
	},
});

export const listByTask = query({
	args: { taskId: v.id("tasks") },
	returns: v.array(deliverableDoc),
	handler: async (ctx, { taskId }) => {
		const deliverables = await ctx.db
			.query("deliverables")
			.withIndex("by_task", (q) => q.eq("taskId", taskId))
			.collect();
		return await resolveDeliverableUrls(ctx, deliverables);
	},
});
