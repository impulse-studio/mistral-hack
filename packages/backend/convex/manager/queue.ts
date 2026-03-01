"use node";

import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { managerAgent } from "../agent";

// ── Manager mailbox processor ────────────────────────────────

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

			// Auto-surface fallback: if manager didn't call sendToUser, surface the response
			if (message.type === "user_message") {
				const text = await result.text;
				const hasSentToUser = await ctx.runQuery(internal.manager.queue.hasRecentManagerMessage, {
					since: startTime,
				});
				if (!hasSentToUser && text) {
					await ctx.runMutation(internal.chat.saveAgentReply, {
						content: text,
						channel: "web",
					});
				}
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

// ── Processing lock mutations ────────────────────────────────

/** Atomically acquire the processing lock by setting agent status to "working". */
export const tryStartProcessing = internalMutation({
	args: { agentId: v.id("agents") },
	returns: v.boolean(),
	handler: async (ctx, { agentId }) => {
		const agent = await ctx.db.get(agentId);
		if (!agent || agent.status !== "idle") return false;
		await ctx.db.patch(agentId, { status: "working" });
		return true;
	},
});

/** Release the lock, set idle, and schedule next processing if messages remain. */
export const finishProcessing = internalMutation({
	args: { agentId: v.id("agents") },
	returns: v.null(),
	handler: async (ctx, { agentId }) => {
		const agent = await ctx.db.get(agentId);
		if (agent && agent.status === "working") {
			await ctx.db.patch(agentId, { status: "idle" });
		}

		// Check for pending messages and schedule next run
		const pending = await ctx.db
			.query("agentMailbox")
			.withIndex("by_recipient_status", (q) => q.eq("recipientId", agentId).eq("status", "pending"))
			.first();

		if (pending) {
			await ctx.scheduler.runAfter(0, internal.manager.queue.processManagerMailbox, {
				agentId,
			});
		}
		return null;
	},
});

// ── Manager status (systemConfig-based) ──────────────────────

/** Upsert the manager-status systemConfig key. */
export const setManagerStatus = internalMutation({
	args: { status: v.string() },
	returns: v.null(),
	handler: async (ctx, { status }) => {
		const existing = await ctx.db
			.query("systemConfig")
			.withIndex("by_key", (q) => q.eq("key", "manager-status"))
			.first();
		if (existing) {
			await ctx.db.patch(existing._id, { value: status });
		} else {
			await ctx.db.insert("systemConfig", { key: "manager-status", value: status });
		}
		return null;
	},
});

/** Public query: read manager processing status for the frontend. */
export const getStatus = query({
	args: {},
	returns: v.string(),
	handler: async (ctx) => {
		const config = await ctx.db
			.query("systemConfig")
			.withIndex("by_key", (q) => q.eq("key", "manager-status"))
			.unique();
		return config?.value ?? "idle";
	},
});

// ── Auto-surface check ──────────────────────────────────────

/** Check if a manager message was written to messages table since a given time. */
export const hasRecentManagerMessage = internalQuery({
	args: { since: v.number() },
	returns: v.boolean(),
	handler: async (ctx, { since }) => {
		const recent = await ctx.db
			.query("messages")
			.withIndex("by_createdAt", (q) => q.gte("createdAt", since))
			.filter((q) => q.eq(q.field("role"), "manager"))
			.first();
		return !!recent;
	},
});
