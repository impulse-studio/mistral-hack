import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Telegram Bot webhook handler.
 * Receives updates from Telegram, persists user messages,
 * and forwards them to the Manager agent for processing.
 */
export const webhook = httpAction(async (ctx, request) => {
	const body = await request.json();
	const message = body?.message;

	// Only handle text messages
	if (!message?.text) return new Response("OK");

	const chatId: number = message.chat.id;
	const text: string = message.text;
	const from: string = message.from?.first_name ?? "User";

	// Handle /start command inline (fast, no Manager needed)
	if (text === "/start") {
		await ctx.runAction(internal.telegram.send.sendMessage, {
			chatId,
			text: [
				`Hey ${from}! I'm the AI Office Manager.`,
				"Send me any task and I'll put my team on it.",
				"",
				'Try: "Build a hello world React app"',
			].join("\n"),
		});
		return new Response("OK");
	}

	// Persist message + schedule Manager processing (atomic)
	await ctx.runMutation(internal.telegram.process.saveAndSchedule, {
		chatId,
		text,
		from,
	});

	return new Response("OK");
});
