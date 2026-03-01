import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { agentMailboxDoc } from "../schema";

// Public query: get pending messages for an agent (for UI display)
export const getPendingForAgent = query({
	args: { agentId: v.id("agents") },
	returns: v.array(agentMailboxDoc),
	handler: async (ctx, { agentId }) => {
		return await ctx.db
			.query("agentMailbox")
			.withIndex("by_recipient_status", (q) => q.eq("recipientId", agentId).eq("status", "pending"))
			.order("asc")
			.collect();
	},
});

// Internal query: fetch a single message by ID
export const getInternal = internalQuery({
	args: { messageId: v.id("agentMailbox") },
	returns: v.union(agentMailboxDoc, v.null()),
	handler: async (ctx, { messageId }) => {
		return await ctx.db.get(messageId);
	},
});

// Internal query: count pending messages for an agent
export const countPending = internalQuery({
	args: { agentId: v.id("agents") },
	returns: v.number(),
	handler: async (ctx, { agentId }) => {
		const pending = await ctx.db
			.query("agentMailbox")
			.withIndex("by_recipient_status", (q) => q.eq("recipientId", agentId).eq("status", "pending"))
			.collect();
		return pending.length;
	},
});
