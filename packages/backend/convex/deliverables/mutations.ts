import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { deliverableTypeValidator } from "../schema";

export const createInternal = internalMutation({
	args: {
		taskId: v.id("tasks"),
		agentId: v.optional(v.id("agents")),
		type: deliverableTypeValidator,
		title: v.string(),
		filename: v.optional(v.string()),
		url: v.optional(v.string()),
		storageId: v.optional(v.id("_storage")),
		mimeType: v.optional(v.string()),
		sizeBytes: v.optional(v.number()),
	},
	returns: v.id("deliverables"),
	handler: async (ctx, args) => {
		return await ctx.db.insert("deliverables", {
			...args,
			createdAt: Date.now(),
		});
	},
});
