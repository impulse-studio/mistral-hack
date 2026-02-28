import {
	createThread,
	listUIMessages,
	saveMessage,
	syncStreams,
	vStreamArgs,
} from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { components, internal } from "./_generated/api";
import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import { managerAgent } from "./agent";

export const createNewThread = mutation({
	args: {},
	handler: async (ctx) => {
		const threadId = await createThread(ctx, components.agent, {});
		return threadId;
	},
});

export const listMessages = query({
	args: {
		threadId: v.string(),
		paginationOpts: paginationOptsValidator,
		streamArgs: vStreamArgs,
	},
	handler: async (ctx, args) => {
		const paginated = await listUIMessages(ctx, components.agent, args);
		const streams = await syncStreams(ctx, components.agent, args);
		return { ...paginated, streams };
	},
});

export const sendMessage = mutation({
	args: {
		threadId: v.string(),
		prompt: v.string(),
		channel: v.optional(v.union(v.literal("web"), v.literal("telegram"))),
	},
	handler: async (ctx, { threadId, prompt, channel }) => {
		const { messageId } = await saveMessage(ctx, components.agent, {
			threadId,
			prompt,
		});

		// Also save to our messages table for multi-channel history
		await ctx.db.insert("messages", {
			content: prompt,
			role: "user",
			channel: channel ?? "web",
			createdAt: Date.now(),
		});

		await ctx.scheduler.runAfter(0, internal.chat.generateResponseAsync, {
			threadId,
			promptMessageId: messageId,
		});
		return messageId;
	},
});

export const generateResponseAsync = internalAction({
	args: {
		threadId: v.string(),
		promptMessageId: v.string(),
	},
	handler: async (ctx, { threadId, promptMessageId }) => {
		await managerAgent.streamText(
			ctx,
			{ threadId },
			{ promptMessageId },
			{ saveStreamDeltas: true },
		);
	},
});

/** Save a user message to the agent thread + messages table (no async generation). */
export const saveUserMessage = mutation({
	args: {
		threadId: v.string(),
		prompt: v.string(),
		channel: v.optional(v.union(v.literal("web"), v.literal("telegram"))),
	},
	handler: async (ctx, { threadId, prompt, channel }) => {
		const { messageId } = await saveMessage(ctx, components.agent, {
			threadId,
			prompt,
		});

		await ctx.db.insert("messages", {
			content: prompt,
			role: "user",
			channel: channel ?? "web",
			createdAt: Date.now(),
		});

		return messageId;
	},
});

/** Persist an agent reply to the messages table (called from actions). */
export const saveAgentReply = internalMutation({
	args: {
		content: v.string(),
		channel: v.union(v.literal("web"), v.literal("telegram")),
	},
	handler: async (ctx, { content, channel }) => {
		await ctx.db.insert("messages", {
			content,
			role: "manager",
			channel,
			createdAt: Date.now(),
		});
	},
});
