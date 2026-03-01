import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// ── Snapshot config (stored in systemConfig table) ──────────

const SNAPSHOT_CONFIG_KEY = "default_snapshot";

export const getDefaultSnapshot = query({
	args: {},
	returns: v.union(v.string(), v.null()),
	handler: async (ctx) => {
		const row = await ctx.db
			.query("systemConfig")
			.withIndex("by_key", (q) => q.eq("key", SNAPSHOT_CONFIG_KEY))
			.first();
		return row?.value ?? null;
	},
});

export const setDefaultSnapshot = mutation({
	args: { snapshotName: v.union(v.string(), v.null()) },
	handler: async (ctx, { snapshotName }) => {
		const existing = await ctx.db
			.query("systemConfig")
			.withIndex("by_key", (q) => q.eq("key", SNAPSHOT_CONFIG_KEY))
			.first();

		if (snapshotName === null) {
			if (existing) await ctx.db.delete(existing._id);
			return;
		}

		if (existing) {
			await ctx.db.patch(existing._id, { value: snapshotName });
		} else {
			await ctx.db.insert("systemConfig", {
				key: SNAPSHOT_CONFIG_KEY,
				value: snapshotName,
			});
		}
	},
});
