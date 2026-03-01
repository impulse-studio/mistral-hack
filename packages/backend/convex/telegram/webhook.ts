import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Telegram Bot webhook handler.
 * Receives updates from Telegram, schedules Chat SDK processing,
 * and returns 200 OK immediately.
 */
export const webhook = httpAction(async (ctx, request) => {
	const body = await request.json();
	const secretToken = request.headers.get("x-telegram-bot-api-secret-token");

	// Schedule async processing via Chat SDK (returns immediately)
	await ctx.scheduler.runAfter(0, internal.telegram.bot.processUpdate, {
		body,
		secretToken,
	});

	return new Response("OK");
});
