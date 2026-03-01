import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";
import { internal } from "../_generated/api";

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
			await ctx.scheduler.runAfter(0, internal.manager.queueAction.processManagerMailbox, {
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
