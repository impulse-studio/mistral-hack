"use node";

import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { managerAgent } from "../agent";
import { streamToSpeech } from "./elevenLabsStream";

/**
 * Stream managerAgent response → ElevenLabs WebSocket TTS.
 * Returns { text, audioBase64 } so the HTTP action can return audio directly.
 */
export const generateVoiceResponse = internalAction({
	args: {
		threadId: v.string(),
		promptMessageId: v.string(),
	},
	handler: async (ctx, { threadId, promptMessageId }) => {
		const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
		const voiceId = process.env.ELEVENLABS_VOICE_ID ?? "JBFqnCBsd6RMkjVDRZzb";

		if (!elevenLabsKey) throw new Error("ELEVENLABS_API_KEY not configured");

		// Start LLM stream — saves to agent thread + streams deltas to UI
		const result = await managerAgent.streamText(
			ctx,
			{ threadId },
			{ promptMessageId },
			{ saveStreamDeltas: true },
		);

		// Pipe text stream → ElevenLabs WebSocket → collect audio chunks
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
