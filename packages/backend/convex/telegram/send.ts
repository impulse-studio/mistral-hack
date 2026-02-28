"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";

const TELEGRAM_API = "https://api.telegram.org/bot";

/** Send a text message to a Telegram chat via Bot API. */
export const sendMessage = internalAction({
	args: {
		chatId: v.number(),
		text: v.string(),
	},
	handler: async (_ctx, { chatId, text }) => {
		const token = process.env.TELEGRAM_BOT_TOKEN;
		if (!token) {
			console.error("TELEGRAM_BOT_TOKEN is not set — skipping Telegram send");
			return;
		}

		const send = async (parseMode?: string) => {
			const body: Record<string, unknown> = { chat_id: chatId, text };
			if (parseMode) body.parse_mode = parseMode;

			return fetch(`${TELEGRAM_API}${token}/sendMessage`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
		};

		// Try Markdown first — fall back to plain text if it fails
		const res = await send("Markdown");
		if (!res.ok) {
			const fallback = await send();
			if (!fallback.ok) {
				console.error("Telegram send failed:", await fallback.text());
			}
		}
	},
});
