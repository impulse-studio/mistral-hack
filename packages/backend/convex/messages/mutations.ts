import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { channelValidator, messageMetadataValidator, messageRoleValidator } from "../schema";

// Send a message (from any channel)
export const send = mutation({
	args: {
		content: v.string(),
		role: messageRoleValidator,
		channel: channelValidator,
		agentId: v.optional(v.id("agents")),
		taskId: v.optional(v.id("tasks")),
		metadata: v.optional(messageMetadataValidator),
	},
	returns: v.id("messages"),
	handler: async (ctx, args) => {
		return await ctx.db.insert("messages", {
			...args,
			createdAt: Date.now(),
		});
	},
});

// Internal send (from agent actions)
export const sendInternal = internalMutation({
	args: {
		content: v.string(),
		role: messageRoleValidator,
		channel: channelValidator,
		agentId: v.optional(v.id("agents")),
		taskId: v.optional(v.id("tasks")),
		metadata: v.optional(messageMetadataValidator),
	},
	returns: v.id("messages"),
	handler: async (ctx, args) => {
		return await ctx.db.insert("messages", {
			...args,
			createdAt: Date.now(),
		});
	},
});
