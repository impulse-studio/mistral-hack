import { v } from "convex/values";
import { query } from "../_generated/server";
import { channelValidator, messageDoc } from "../schema";

// List messages for a channel (paginated, newest first)
export const listByChannel = query({
	args: {
		channel: channelValidator,
		limit: v.optional(v.number()),
	},
	returns: v.array(messageDoc),
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
	returns: v.array(messageDoc),
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
	returns: v.object({
		total: v.number(),
		web: v.number(),
		telegram: v.number(),
	}),
	handler: async (ctx) => {
		// Use index-based queries instead of collecting all and filtering
		const [webMessages, telegramMessages] = await Promise.all([
			ctx.db
				.query("messages")
				.withIndex("by_channel", (q) => q.eq("channel", "web"))
				.collect(),
			ctx.db
				.query("messages")
				.withIndex("by_channel", (q) => q.eq("channel", "telegram"))
				.collect(),
		]);
		return {
			total: webMessages.length + telegramMessages.length,
			web: webMessages.length,
			telegram: telegramMessages.length,
		};
	},
});
