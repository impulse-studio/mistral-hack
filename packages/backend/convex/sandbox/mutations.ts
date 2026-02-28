import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { sandboxStatusValidator } from "../schema";

// Create or get sandbox record for a specific agent
export const ensureSandbox = mutation({
	args: {
		daytonaId: v.string(),
		agentId: v.optional(v.id("agents")),
		name: v.optional(v.string()),
	},
	handler: async (ctx, { daytonaId, agentId, name }) => {
		// If agentId provided, look up by agent
		if (agentId) {
			const existing = await ctx.db
				.query("sandbox")
				.withIndex("by_agent", (q) => q.eq("agentId", agentId))
				.first();
			if (existing) {
				if (existing.daytonaId !== daytonaId) {
					await ctx.db.patch(existing._id, { daytonaId });
				}
				return existing._id;
			}
		}

		return await ctx.db.insert("sandbox", {
			daytonaId,
			agentId,
			name,
			status: "creating",
			autoStopInterval: 15,
			lastActivity: Date.now(),
		});
	},
});

// Internal version for use by actions
export const ensureSandboxInternal = internalMutation({
	args: {
		daytonaId: v.string(),
		agentId: v.optional(v.id("agents")),
		name: v.optional(v.string()),
	},
	handler: async (ctx, { daytonaId, agentId, name }) => {
		if (agentId) {
			const existing = await ctx.db
				.query("sandbox")
				.withIndex("by_agent", (q) => q.eq("agentId", agentId))
				.first();
			if (existing) {
				if (existing.daytonaId !== daytonaId) {
					await ctx.db.patch(existing._id, { daytonaId });
				}
				return existing._id;
			}
		}

		return await ctx.db.insert("sandbox", {
			daytonaId,
			agentId,
			name,
			status: "creating",
			autoStopInterval: 15,
			lastActivity: Date.now(),
		});
	},
});

// Update sandbox status
export const updateStatus = internalMutation({
	args: {
		sandboxId: v.id("sandbox"),
		status: sandboxStatusValidator,
		error: v.optional(v.string()),
	},
	handler: async (ctx, { sandboxId, status, error }) => {
		const patch: Record<string, unknown> = { status };
		if (error !== undefined) patch.error = error;
		if (status === "running") {
			patch.lastActivity = Date.now();
			patch.error = undefined;
		}
		await ctx.db.patch(sandboxId, patch);
	},
});

// Record activity (extends auto-stop timer)
export const recordActivity = internalMutation({
	args: { sandboxId: v.id("sandbox") },
	handler: async (ctx, { sandboxId }) => {
		await ctx.db.patch(sandboxId, {
			lastActivity: Date.now(),
		});
	},
});

// Update auto-stop interval
export const setAutoStopInterval = mutation({
	args: {
		sandboxId: v.id("sandbox"),
		minutes: v.number(),
	},
	handler: async (ctx, { sandboxId, minutes }) => {
		await ctx.db.patch(sandboxId, {
			autoStopInterval: minutes,
		});
	},
});

// Update disk usage
export const updateDiskUsage = internalMutation({
	args: {
		sandboxId: v.id("sandbox"),
		diskUsage: v.string(),
	},
	handler: async (ctx, { sandboxId, diskUsage }) => {
		await ctx.db.patch(sandboxId, { diskUsage });
	},
});
