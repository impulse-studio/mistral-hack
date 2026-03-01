"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { managerAgent } from "../agents/manager/agent";

// ── Manager mailbox processor (action — must be in "use node" file) ──

export const processManagerMailbox = internalAction({
	args: { agentId: v.id("agents") },
	returns: v.null(),
	handler: async (ctx, { agentId }) => {
		// Acquire processing lock (prevents concurrent manager processing)
		const locked = await ctx.runMutation(internal.manager.queue.tryStartProcessing, { agentId });
		if (!locked) return null;

		try {
			// Dequeue highest-priority pending message
			const messageId = await ctx.runMutation(internal.mailbox.mutations.dequeue, { agentId });
			if (!messageId) {
				// Queue empty — release lock and idle
				return null;
			}

			const message = await ctx.runQuery(internal.mailbox.queries.getInternal, { messageId });
			if (!message) {
				await ctx.runMutation(internal.mailbox.mutations.markProcessed, {
					messageId,
					status: "failed",
				});
				return null;
			}

			// Set display status based on message type
			const displayStatus =
				message.type === "user_message" ? "processing_user_request" : "background_work";
			await ctx.runMutation(internal.manager.queue.setManagerStatus, { status: displayStatus });

			// Get the shared thread for manager context
			const threadId = await ctx.runQuery(internal.chat.getSharedThreadIdInternal);
			if (!threadId) {
				await ctx.runMutation(internal.mailbox.mutations.markProcessed, {
					messageId,
					status: "failed",
				});
				return null;
			}

			// For user_message: threadMessageId was set during sendMessage
			// For notifications: save to thread first to get a promptMessageId
			let promptMessageId = message.threadMessageId;
			if (!promptMessageId) {
				const saved = await ctx.runMutation(internal.chat.saveToThreadInternal, {
					threadId,
					prompt: message.payload,
				});
				promptMessageId = saved;
			}

			const startTime = Date.now();

			// Run manager agent on the internal thread (invisible to user)
			const result = await managerAgent.streamText(
				ctx,
				{ threadId },
				{ promptMessageId },
				{ saveStreamDeltas: true },
			);

			// Ensure user gets a response for user_message types.
			// The agent SHOULD call sendToUser during streamText, but if it didn't,
			// surface a brief fallback rather than leaving the user hanging.
			if (message.type === "user_message") {
				// Consume the stream so all tool calls complete
				await result.text;
				const hasSentToUser = await ctx.runQuery(internal.manager.queue.hasRecentManagerMessage, {
					since: startTime,
				});
				if (!hasSentToUser) {
					await ctx.runMutation(internal.chat.saveAgentReply, {
						content: "Done — let me know if you need anything else.",
						channel: "web",
					});
				}
			} else {
				// Background work — just consume the stream, don't surface anything
				await result.text;
			}

			// Mark message as processed
			await ctx.runMutation(internal.mailbox.mutations.markProcessed, {
				messageId,
				status: "done",
			});
		} finally {
			// Release lock + set idle + check for remaining messages
			await ctx.runMutation(internal.manager.queue.finishProcessing, { agentId });
			await ctx.runMutation(internal.manager.queue.setManagerStatus, { status: "idle" });
		}

		return null;
	},
});
