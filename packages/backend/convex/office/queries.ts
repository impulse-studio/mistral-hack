import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { agentDoc, deskDoc, taskDoc } from "../schema";

// Get full office state — all desks with their occupants
export const getOfficeState = query({
	args: {},
	returns: v.object({
		desks: v.array(deskDoc),
		agents: v.array(agentDoc),
	}),
	handler: async (ctx) => {
		const desks = await ctx.db.query("desks").collect();
		const agents = await ctx.db.query("agents").withIndex("by_status").collect();

		return { desks, agents };
	},
});

// Get all active agents (not completed/despawning)
export const getActiveAgents = query({
	args: {},
	returns: v.array(agentDoc),
	handler: async (ctx) => {
		// Fetch only active statuses via index instead of filtering all agents
		const [idle, thinking, working, failed] = await Promise.all([
			ctx.db
				.query("agents")
				.withIndex("by_status", (q) => q.eq("status", "idle"))
				.collect(),
			ctx.db
				.query("agents")
				.withIndex("by_status", (q) => q.eq("status", "thinking"))
				.collect(),
			ctx.db
				.query("agents")
				.withIndex("by_status", (q) => q.eq("status", "working"))
				.collect(),
			ctx.db
				.query("agents")
				.withIndex("by_status", (q) => q.eq("status", "failed"))
				.collect(),
		]);
		return [...idle, ...thinking, ...working, ...failed];
	},
});

// Get a single agent with their desk info
export const getAgent = query({
	args: { agentId: v.id("agents") },
	returns: v.union(
		v.object({
			agent: agentDoc,
			desk: v.union(deskDoc, v.null()),
			currentTask: v.union(taskDoc, v.null()),
		}),
		v.null(),
	),
	handler: async (ctx, { agentId }) => {
		const agent = await ctx.db.get(agentId);
		if (!agent) return null;

		let desk = null;
		if (agent.deskId) {
			desk = await ctx.db.get(agent.deskId);
		}

		let currentTask = null;
		if (agent.currentTaskId) {
			currentTask = await ctx.db.get(agent.currentTaskId);
		}

		return { agent, desk, currentTask };
	},
});

// Internal version for use by actions (runner, lifecycle, etc.)
export const getAgentInternal = internalQuery({
	args: { agentId: v.id("agents") },
	returns: v.union(agentDoc, v.null()),
	handler: async (ctx, { agentId }) => {
		return await ctx.db.get(agentId);
	},
});

// Get all desks
export const getDesks = query({
	args: {},
	returns: v.array(deskDoc),
	handler: async (ctx) => {
		return await ctx.db.query("desks").collect();
	},
});

// Get worker agents that are idle or failed past a staleness cutoff
export const getStaleAgents = internalQuery({
	args: { cutoff: v.number() },
	returns: v.array(agentDoc),
	handler: async (ctx, { cutoff }) => {
		const [idle, failed] = await Promise.all([
			ctx.db
				.query("agents")
				.withIndex("by_status", (q) => q.eq("status", "idle"))
				.collect(),
			ctx.db
				.query("agents")
				.withIndex("by_status", (q) => q.eq("status", "failed"))
				.collect(),
		]);
		return [...idle, ...failed].filter(
			(a) => a.type === "worker" && a.completedAt !== undefined && a.completedAt < cutoff,
		);
	},
});

// Get available desk count (public)
export const getAvailableDeskCount = query({
	args: {},
	returns: v.number(),
	handler: async (ctx) => {
		const desks = await ctx.db.query("desks").collect();
		return desks.filter((d) => !d.occupiedBy).length;
	},
});
