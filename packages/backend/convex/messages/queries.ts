import { v } from "convex/values";
import { query } from "../_generated/server";
import { channelValidator } from "../schema";

// List messages for a channel (paginated, newest first)
export const listByChannel = query({
	args: {
		channel: channelValidator,
		limit: v.optional(v.number()),
	},
	handler: async (ctx, { channel, limit }) => {
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_channel_time", (q) => q.eq("channel", channel))
			.order("desc")
			.take(limit ?? 50);

		return messages.reverse(); // return chronological
	},
});

// List all recent messages across channels
export const listRecent = query({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, { limit }) => {
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_createdAt")
			.order("desc")
			.take(limit ?? 50);

		return messages.reverse();
	},
});

// Get message count per channel
export const getStats = query({
	args: {},
	handler: async (ctx) => {
		const all = await ctx.db.query("messages").collect();
		const web = all.filter((m) => m.channel === "web").length;
		const telegram = all.filter((m) => m.channel === "telegram").length;
		return { total: all.length, web, telegram };
	},
});
