import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

// Get a systemConfig value by key (for use in actions)
export const get = internalQuery({
	args: { key: v.string() },
	returns: v.union(v.string(), v.null()),
	handler: async (ctx, { key }) => {
		const row = await ctx.db
			.query("systemConfig")
			.withIndex("by_key", (q) => q.eq("key", key))
			.first();
		return row?.value ?? null;
	},
});
