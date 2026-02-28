import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { logTypeValidator } from "../schema";

// Append a log entry for an agent
export const append = internalMutation({
	args: {
		agentId: v.id("agents"),
		type: logTypeValidator,
		content: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("agentLogs", {
			...args,
			timestamp: Date.now(),
		});
	},
});

// Batch append multiple log entries
export const appendBatch = internalMutation({
	args: {
		agentId: v.id("agents"),
		entries: v.array(
			v.object({
				type: logTypeValidator,
				content: v.string(),
			}),
		),
	},
	handler: async (ctx, { agentId, entries }) => {
		const now = Date.now();
		for (let i = 0; i < entries.length; i++) {
			const entry = entries[i]!;
			await ctx.db.insert("agentLogs", {
				agentId,
				type: entry.type,
				content: entry.content,
				timestamp: now + i, // ensure ordering
			});
		}
	},
});

// Append a screenshot log entry (with storage reference)
export const appendScreenshotLog = internalMutation({
	args: {
		agentId: v.id("agents"),
		screenshotId: v.id("_storage"),
		content: v.string(),
	},
	handler: async (ctx, { agentId, screenshotId, content }) => {
		return await ctx.db.insert("agentLogs", {
			agentId,
			type: "screenshot",
			content,
			screenshotId,
			timestamp: Date.now(),
		});
	},
});

// Clear logs for an agent (when despawning)
export const clearForAgent = internalMutation({
	args: { agentId: v.id("agents") },
	handler: async (ctx, { agentId }) => {
		const logs = await ctx.db
			.query("agentLogs")
			.withIndex("by_agent", (q) => q.eq("agentId", agentId))
			.collect();

		for (const log of logs) {
			if (log.screenshotId) {
				await ctx.storage.delete(log.screenshotId);
			}
			await ctx.db.delete(log._id);
		}
	},
});
