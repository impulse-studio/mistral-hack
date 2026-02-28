import { v } from "convex/values";
import { query } from "../_generated/server";

// Get full office state — all desks with their occupants
export const getOfficeState = query({
	args: {},
	handler: async (ctx) => {
		const desks = await ctx.db.query("desks").collect();
		const agents = await ctx.db.query("agents").withIndex("by_status").collect();

		return { desks, agents };
	},
});

// Get all active agents (not completed/despawning)
export const getActiveAgents = query({
	args: {},
	handler: async (ctx) => {
		const agents = await ctx.db.query("agents").collect();
		return agents.filter((a) => a.status !== "completed" && a.status !== "despawning");
	},
});

// Get a single agent with their desk info
export const getAgent = query({
	args: { agentId: v.id("agents") },
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

// Get all desks
export const getDesks = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("desks").collect();
	},
});

// Get available desk count
export const getAvailableDeskCount = query({
	args: {},
	handler: async (ctx) => {
		const desks = await ctx.db.query("desks").collect();
		return desks.filter((d) => !d.occupiedBy).length;
	},
});
