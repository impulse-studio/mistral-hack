"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { internalAction } from "../_generated/server";
import { managerAgent } from "../agent";
import { TelegramService, type TelegramMessage } from "./TelegramService";

// ── Convex action: process a Telegram update ─────────────

export const processUpdate = internalAction({
	args: {
		body: v.any(),
		secretToken: v.optional(v.union(v.string(), v.null())),
	},
	handler: async (ctx, { body, secretToken }) => {
		// Validate webhook secret
		const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN;
		if (expectedSecret && secretToken !== expectedSecret) {
			console.warn("[telegram] Invalid webhook secret — ignoring update");
			return;
		}

		const token = process.env.TELEGRAM_BOT_TOKEN;
		if (!token) {
			console.error("[telegram] TELEGRAM_BOT_TOKEN is not set");
			return;
		}

		const telegram = new TelegramService(token);
		const message = TelegramService.parseUpdate(body);

		if (!message) {
			console.log("[telegram] Update has no handleable message — skipping");
			return;
		}

		// In group chats, only respond to mentions / commands
		if ((message.chatType === "group" || message.chatType === "supergroup") && !message.isMention) {
			return;
		}

		await handleMessage(ctx, telegram, message);
	},
});

// ── Message handler ──────────────────────────────────────

async function handleMessage(ctx: ActionCtx, telegram: TelegramService, message: TelegramMessage) {
	const { chatId, text } = message;

	if (!text || text.trim() === "") return;

	// Handle /start
	if (text.startsWith("/start")) {
		await telegram.sendMessage(
			chatId,
			[
				"Hey! I'm the AI Office Manager.",
				"Send me any task and I'll put my team on it.",
				"",
				'Try: "Build a hello world React app"',
			].join("\n"),
		);
		return;
	}

	// Strip bot mention from group messages
	const cleanText = text.replace(/@\w+/g, "").trim();
	if (!cleanText) return;

	try {
		await telegram.sendTyping(chatId);

		// 1. Get the shared thread (same one the web UI uses)
		const threadId = await ctx.runMutation(internal.chat.getOrCreateSharedThread, {});

		// 2. Save user message to thread + messages table
		const metadata: Record<string, string> = {
			chatId: String(chatId),
		};
		if (message.from?.username) metadata.username = message.from.username;
		if (message.from?.firstName) metadata.firstName = message.from.firstName;

		const promptMessageId = await ctx.runMutation(internal.chat.saveUserMessageInternal, {
			threadId,
			prompt: cleanText,
			channel: "telegram",
			metadata,
		});

		// 3. Generate Manager response (streams to web UI in real-time)
		const result = await managerAgent.streamText(
			ctx,
			{ threadId },
			{ promptMessageId },
			{ saveStreamDeltas: true },
		);

		const replyText = await result.text;

		// 4. Persist manager reply to messages table
		await ctx.runMutation(internal.chat.saveAgentReply, {
			content: replyText,
			channel: "telegram",
		});

		// 5. Send response on Telegram
		if (replyText) {
			await telegram.sendMessage(chatId, replyText);
		} else {
			await telegram.sendMessage(
				chatId,
				"Task received! Check the web dashboard for live updates.",
			);
		}
	} catch (error) {
		console.error("[telegram] Handler error:", error);
		try {
			await telegram.sendMessage(
				chatId,
				"Something went wrong. Please try again or check the web dashboard.",
			);
		} catch (sendError) {
			console.error("[telegram] Failed to send error message:", sendError);
		}
	}
}
