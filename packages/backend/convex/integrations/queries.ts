import { v } from "convex/values";
import { query } from "../_generated/server";
import { integrationConnectionDoc } from "../schema";

export const listConnections = query({
	args: {},
	returns: v.array(integrationConnectionDoc),
	handler: async (ctx) => {
		// TODO: filter by authenticated user once auth context is wired
		return await ctx.db.query("integrationConnections").collect();
	},
});
