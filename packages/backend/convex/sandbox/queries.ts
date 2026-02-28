import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { sandboxDoc, sandboxFields } from "../schema";

// Get sandbox record for a specific agent (internal)
export const getByAgentInternal = internalQuery({
	args: { agentId: v.id("agents") },
	returns: v.union(sandboxDoc, v.null()),
	handler: async (ctx, { agentId }) => {
		return await ctx.db
			.query("sandbox")
			.withIndex("by_agent", (q) => q.eq("agentId", agentId))
			.first();
	},
});

// Get sandbox record for a specific agent (public)
export const getByAgent = query({
	args: { agentId: v.id("agents") },
	returns: v.union(sandboxDoc, v.null()),
	handler: async (ctx, { agentId }) => {
		return await ctx.db
			.query("sandbox")
			.withIndex("by_agent", (q) => q.eq("agentId", agentId))
			.first();
	},
});

// Legacy: get the first sandbox (backwards compat)
export const get = query({
	args: {},
	returns: v.union(sandboxDoc, v.null()),
	handler: async (ctx) => {
		return await ctx.db.query("sandbox").first();
	},
});

// Legacy: internal version
export const getInternal = internalQuery({
	args: {},
	returns: v.union(sandboxDoc, v.null()),
	handler: async (ctx) => {
		return await ctx.db.query("sandbox").first();
	},
});

// List all sandboxes (internal — for lifecycle cleanup)
export const getAllSandboxesInternal = internalQuery({
	args: {},
	returns: v.array(sandboxDoc),
	handler: async (ctx) => {
		return await ctx.db.query("sandbox").collect();
	},
});

const enrichedSandbox = v.object({
	_id: v.id("sandbox"),
	_creationTime: v.number(),
	...sandboxFields,
	agentName: v.union(v.string(), v.null()),
	agentRole: v.union(v.string(), v.null()),
});

// List all sandboxes (for UI)
export const getAllSandboxes = query({
	args: {},
	returns: v.array(enrichedSandbox),
	handler: async (ctx) => {
		const sandboxes = await ctx.db.query("sandbox").collect();
		return Promise.all(
			sandboxes.map(async (sb) => {
				const agent = sb.agentId ? await ctx.db.get(sb.agentId) : null;
				return {
					...sb,
					agentName: agent?.name ?? null,
					agentRole: agent?.role ?? null,
				};
			}),
		);
	},
});

// Get sandbox status for the UI indicator (shows all sandboxes summary)
export const getStatus = query({
	args: {},
	returns: v.object({
		status: v.union(v.literal("none"), v.literal("running"), v.literal("stopped")),
		isActive: v.boolean(),
		count: v.number(),
		runningCount: v.optional(v.number()),
	}),
	handler: async (ctx) => {
		const sandboxes = await ctx.db.query("sandbox").collect();
		if (sandboxes.length === 0) return { status: "none" as const, isActive: false, count: 0 };

		// Use index to count running/creating sandboxes instead of filtering
		const [running, creating] = await Promise.all([
			ctx.db
				.query("sandbox")
				.withIndex("by_status", (q) => q.eq("status", "running"))
				.collect(),
			ctx.db
				.query("sandbox")
				.withIndex("by_status", (q) => q.eq("status", "creating"))
				.collect(),
		]);
		const runningCount = running.length + creating.length;

		return {
			status: runningCount > 0 ? ("running" as const) : ("stopped" as const),
			isActive: runningCount > 0,
			count: sandboxes.length,
			runningCount,
		};
	},
});
