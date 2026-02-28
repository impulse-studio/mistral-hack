import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";

// Get sandbox record for a specific agent (internal)
export const getByAgentInternal = internalQuery({
	args: { agentId: v.id("agents") },
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
	handler: async (ctx) => {
		const sandboxes = await ctx.db.query("sandbox").collect();
		return sandboxes[0] ?? null;
	},
});

// Legacy: internal version
export const getInternal = internalQuery({
	args: {},
	handler: async (ctx) => {
		const sandboxes = await ctx.db.query("sandbox").collect();
		return sandboxes[0] ?? null;
	},
});

// List all sandboxes (internal — for lifecycle cleanup)
export const getAllSandboxesInternal = internalQuery({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("sandbox").collect();
	},
});

// List all sandboxes (for UI)
export const getAllSandboxes = query({
	args: {},
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
	handler: async (ctx) => {
		const sandboxes = await ctx.db.query("sandbox").collect();
		if (sandboxes.length === 0) return { status: "none" as const, isActive: false, count: 0 };

		const running = sandboxes.filter((s) => s.status === "running" || s.status === "creating");

		return {
			status: running.length > 0 ? ("running" as const) : ("stopped" as const),
			isActive: running.length > 0,
			count: sandboxes.length,
			runningCount: running.length,
		};
	},
});
