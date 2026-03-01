import {
	createThread,
	listUIMessages,
	saveMessage,
	syncStreams,
	vStreamArgs,
} from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { components, internal } from "./_generated/api";
import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import { managerAgent } from "./agent";
import { streamToSpeech } from "./voice/elevenLabsStream";

// ── Shared thread (single Manager thread for all channels) ───

const SHARED_THREAD_KEY = "shared-thread-id";

/** Get or create the shared Manager thread (internal — for Telegram bot). */
export const getOrCreateSharedThread = internalMutation({
	args: {},
	returns: v.string(),
	handler: async (ctx) => {
		const existing = await ctx.db
			.query("systemConfig")
			.withIndex("by_key", (q) => q.eq("key", SHARED_THREAD_KEY))
			.first();
		if (existing) return existing.value;

		const threadId = await createThread(ctx, components.agent, {});
		await ctx.db.insert("systemConfig", {
			key: SHARED_THREAD_KEY,
			value: threadId,
		});
		return threadId;
	},
});

/** Get the shared thread ID (public — for web UI). */
export const getSharedThreadId = query({
	args: {},
	returns: v.union(v.string(), v.null()),
	handler: async (ctx) => {
		const existing = await ctx.db
			.query("systemConfig")
			.withIndex("by_key", (q) => q.eq("key", SHARED_THREAD_KEY))
			.first();
		return existing?.value ?? null;
	},
});

/** Save a user message to thread + messages table (internal — no generation). */
export const saveUserMessageInternal = internalMutation({
	args: {
		threadId: v.string(),
		prompt: v.string(),
		channel: v.optional(v.union(v.literal("web"), v.literal("telegram"))),
		metadata: v.optional(v.record(v.string(), v.string())),
	},
	returns: v.string(),
	handler: async (ctx, { threadId, prompt, channel, metadata }) => {
		const { messageId } = await saveMessage(ctx, components.agent, {
			threadId,
			prompt,
		});

		await ctx.db.insert("messages", {
			content: prompt,
			role: "user",
			channel: channel ?? "web",
			metadata,
			createdAt: Date.now(),
		});

		return messageId;
	},
});

export const createNewThread = mutation({
	args: {},
	returns: v.string(),
	handler: async (ctx) => {
		const threadId = await createThread(ctx, components.agent, {});
		return threadId;
	},
});

/** Public version of getOrCreateSharedThread — for the web UI. */
export const ensureSharedThread = mutation({
	args: {},
	returns: v.string(),
	handler: async (ctx) => {
		const existing = await ctx.db
			.query("systemConfig")
			.withIndex("by_key", (q) => q.eq("key", SHARED_THREAD_KEY))
			.first();
		if (existing) return existing.value;

		const threadId = await createThread(ctx, components.agent, {});
		await ctx.db.insert("systemConfig", {
			key: SHARED_THREAD_KEY,
			value: threadId,
		});
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
	returns: v.string(),
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
	returns: v.null(),
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
	returns: v.string(),
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

/**
 * Stream managerAgent response -> ElevenLabs WebSocket TTS.
 * Returns { text, audioBase64 } so the HTTP action can return audio directly.
 */
export const generateVoiceResponse = internalAction({
	args: {
		threadId: v.string(),
		promptMessageId: v.string(),
	},
	returns: v.object({ text: v.string(), audioBase64: v.string() }),
	handler: async (ctx, { threadId, promptMessageId }) => {
		const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
		const voiceId = process.env.ELEVENLABS_VOICE_ID ?? "JBFqnCBsd6RMkjVDRZzb";

		if (!elevenLabsKey) throw new ConvexError("ELEVENLABS_API_KEY not configured");

		// Start LLM stream — saves to agent thread + streams deltas to UI
		const result = await managerAgent.streamText(
			ctx,
			{ threadId },
			{ promptMessageId },
			{ saveStreamDeltas: true },
		);

		// Pipe text stream -> ElevenLabs WebSocket -> collect audio chunks
		const audioBase64 = await streamToSpeech(result.textStream, elevenLabsKey, voiceId);

		// Get full reply text (already resolved since stream is consumed)
		const text = await result.text;

		// Persist to messages table
		await ctx.runMutation(internal.chat.saveAgentReply, {
			content: text,
			channel: "web",
		});

		return { text, audioBase64 };
	},
});

/** Persist an agent reply to the messages table (called from actions). */
export const saveAgentReply = internalMutation({
	args: {
		content: v.string(),
		channel: v.union(v.literal("web"), v.literal("telegram")),
	},
	returns: v.null(),
	handler: async (ctx, { content, channel }) => {
		await ctx.db.insert("messages", {
			content,
			role: "manager",
			channel,
			createdAt: Date.now(),
		});
	},
});
