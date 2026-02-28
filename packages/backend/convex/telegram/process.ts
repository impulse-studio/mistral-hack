import { internalAction, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";

/** Extract text content from a UIMessage parts array. */
function extractText(parts: Array<{ type?: string; text?: string }>): string {
	return parts
		.filter((p) => p.type === "text" && p.text)
		.map((p) => p.text)
		.join("\n");
}

/** Persist a Telegram message and schedule Manager forwarding. */
export const saveAndSchedule = internalMutation({
	args: {
		chatId: v.number(),
		text: v.string(),
		from: v.string(),
	},
	handler: async (ctx, { chatId, text, from }) => {
		await ctx.db.insert("messages", {
			content: text,
			role: "user",
			channel: "telegram",
			metadata: { telegramChatId: chatId, telegramFrom: from },
			createdAt: Date.now(),
		});

		await ctx.scheduler.runAfter(0, internal.telegram.process.forwardToManager, { chatId, text });
	},
});

/** Forward a Telegram message to the Manager agent and relay the response back. */
export const forwardToManager = internalAction({
	args: {
		chatId: v.number(),
		text: v.string(),
	},
	handler: async (ctx, { chatId, text }) => {
		try {
			// Create a Manager thread and send the user message
			const threadId = await ctx.runMutation(api.manager.api.createThread, {});
			await ctx.runMutation(api.manager.api.sendMessage, {
				threadId,
				prompt: text,
			});

			// Poll thread status + messages (max ~60s)
			for (let i = 0; i < 30; i++) {
				await new Promise<void>((r) => {
					setTimeout(r, 2000);
				});

				const thread = await ctx.runQuery(api.manager.api.getThread, {
					threadId,
				});

				// Wait until the thread has finished processing
				const done = thread?.status === "completed" || thread?.status === "failed";
				if (!done) continue;

				const msgs = await ctx.runQuery(api.manager.api.listMessages, {
					threadId,
				});

				// Find the last assistant message with text parts
				const reply = [...(msgs ?? [])]
					.reverse()
					.find(
						(m) =>
							m.role === "assistant" &&
							Array.isArray(m.parts) &&
							m.parts.some((p: { type?: string }) => p.type === "text"),
					);

				if (reply) {
					const replyText = extractText(reply.parts);

					if (replyText) {
						// Persist Manager reply
						await ctx.runMutation(internal.messages.mutations.sendInternal, {
							content: replyText,
							role: "manager",
							channel: "telegram",
							metadata: {
								telegramChatId: chatId,
								threadId,
							},
						});

						// Send back to Telegram
						await ctx.runAction(internal.telegram.send.sendMessage, { chatId, text: replyText });
						return;
					}
				}

				// Thread finished but no text in assistant message
				break;
			}

			// Timeout or no reply fallback
			await ctx.runAction(internal.telegram.send.sendMessage, {
				chatId,
				text: "Your task is being processed. Check the web dashboard for live updates!",
			});
		} catch (error) {
			console.error("Telegram -> Manager forwarding failed:", error);
			await ctx.runAction(internal.telegram.send.sendMessage, {
				chatId,
				text: "Something went wrong. Please try again or check the web dashboard.",
			});
		}
	},
});
