import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { mailboxMessageTypeValidator } from "../schema";

// Enqueue a message to an agent's mailbox
export const enqueue = internalMutation({
	args: {
		recipientId: v.id("agents"),
		senderId: v.optional(v.id("agents")),
		type: mailboxMessageTypeValidator,
		payload: v.string(),
		taskId: v.optional(v.id("tasks")),
		priority: v.optional(v.number()),
		threadMessageId: v.optional(v.string()),
	},
	returns: v.id("agentMailbox"),
	handler: async (
		ctx,
		{ recipientId, senderId, type, payload, taskId, priority, threadMessageId },
	) => {
		const recipient = await ctx.db.get(recipientId);
		if (!recipient) throw new Error(`Recipient agent ${recipientId} not found`);

		// If agent is despawning, dead-letter immediately
		if (recipient.status === "despawning") {
			return await ctx.db.insert("agentMailbox", {
				recipientId,
				senderId,
				type,
				status: "dead_letter",
				payload,
				taskId,
				priority: priority ?? 0,
				threadMessageId,
				createdAt: Date.now(),
			});
		}

		const messageId = await ctx.db.insert("agentMailbox", {
			recipientId,
			senderId,
			type,
			status: "pending",
			payload,
			taskId,
			priority: priority ?? 0,
			threadMessageId,
			createdAt: Date.now(),
		});

		// Route to the correct processor based on agent type
		if (recipient.type === "manager") {
			// Manager uses dedicated processor with priority queue + sendToUser
			// Check agent.status (the actual processing lock), NOT systemConfig "manager-status" (display only)
			if (recipient.status === "idle") {
				await ctx.scheduler.runAfter(0, internal.manager.queueAction.processManagerMailbox, {
					agentId: recipientId,
				});
			}
		} else if (recipient.status === "idle") {
			// Workers use standard mailbox processing
			await ctx.scheduler.runAfter(0, internal.mailbox.process.processMailbox, {
				agentId: recipientId,
			});
		}

		return messageId;
	},
});

// Dequeue the oldest pending message for an agent → mark as processing
export const dequeue = internalMutation({
	args: { agentId: v.id("agents") },
	returns: v.union(v.id("agentMailbox"), v.null()),
	handler: async (ctx, { agentId }) => {
		// Priority order: critical (2) → high (1) → normal (0), then oldest first
		const pending = await ctx.db
			.query("agentMailbox")
			.withIndex("by_recipient_status", (q) => q.eq("recipientId", agentId).eq("status", "pending"))
			.order("asc")
			.collect();

		if (pending.length === 0) return null;

		// Pick highest priority, breaking ties by oldest createdAt
		const message = pending.reduce((best, msg) => (msg.priority > best.priority ? msg : best));

		await ctx.db.patch(message._id, { status: "processing" });
		return message._id;
	},
});

// Mark a message as done or failed after handling
export const markProcessed = internalMutation({
	args: {
		messageId: v.id("agentMailbox"),
		status: v.union(v.literal("done"), v.literal("failed")),
	},
	returns: v.null(),
	handler: async (ctx, { messageId, status }) => {
		await ctx.db.patch(messageId, {
			status,
			processedAt: Date.now(),
		});
		return null;
	},
});

// Dead-letter all pending messages when agent despawns
export const deadLetterAll = internalMutation({
	args: { agentId: v.id("agents") },
	returns: v.null(),
	handler: async (ctx, { agentId }) => {
		const pending = await ctx.db
			.query("agentMailbox")
			.withIndex("by_recipient_status", (q) => q.eq("recipientId", agentId).eq("status", "pending"))
			.collect();

		for (const msg of pending) {
			await ctx.db.patch(msg._id, {
				status: "dead_letter",
				processedAt: Date.now(),
			});
		}
		return null;
	},
});
