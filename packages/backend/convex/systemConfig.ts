import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

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

// Set (upsert) a systemConfig value by key
export const set = internalMutation({
	args: { key: v.string(), value: v.string() },
	handler: async (ctx, { key, value }) => {
		const row = await ctx.db
			.query("systemConfig")
			.withIndex("by_key", (q) => q.eq("key", key))
			.first();
		if (row) {
			await ctx.db.patch(row._id, { value });
		} else {
			await ctx.db.insert("systemConfig", { key, value });
		}
	},
});
