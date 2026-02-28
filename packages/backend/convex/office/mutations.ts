import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { agentStatusValidator } from "../schema";

// Initialize desks for the pixel-art office (8 worker + 1 manager)
export const initDesks = mutation({
	args: {},
	handler: async (ctx) => {
		// Check if desks already exist
		const existing = await ctx.db.query("desks").collect();
		if (existing.length > 0) return existing.map((d) => d._id);

		// 8 worker desks in a 2×4 grid
		const workerPositions = [
			{ x: 1, y: 1 },
			{ x: 2, y: 1 },
			{ x: 3, y: 1 },
			{ x: 4, y: 1 },
			{ x: 1, y: 2 },
			{ x: 2, y: 2 },
			{ x: 3, y: 2 },
			{ x: 4, y: 2 },
		];

		const ids = [];
		for (const position of workerPositions) {
			const id = await ctx.db.insert("desks", { position });
			ids.push(id);
		}

		// 1 manager desk — separate office
		const mgrId = await ctx.db.insert("desks", {
			position: { x: 0, y: 0 },
			label: "manager",
		});
		ids.push(mgrId);

		return ids;
	},
});

// Ensure the manager agent exists and is seated at the manager desk
export const ensureManager = mutation({
	args: {},
	handler: async (ctx) => {
		// Check if a manager agent already exists
		const existing = await ctx.db
			.query("agents")
			.withIndex("by_type", (q) => q.eq("type", "manager"))
			.first();
		if (existing) return existing._id;

		// Find the manager desk
		const desks = await ctx.db.query("desks").collect();
		const mgrDesk = desks.find((d) => d.label === "manager");
		if (!mgrDesk) throw new Error("Manager desk not found — run initDesks first");

		// Create the manager agent
		const agentId = await ctx.db.insert("agents", {
			name: "Manager",
			type: "manager",
			role: "orchestrator",
			status: "idle",
			model: "mistral-large-latest",
			deskId: mgrDesk._id,
			color: "#FF7000",
			position: mgrDesk.position,
			spawnedAt: Date.now(),
		});

		// Assign desk
		await ctx.db.patch(mgrDesk._id, { occupiedBy: agentId });
		return agentId;
	},
});

// Spawn a new agent at an available desk
export const spawnAgent = mutation({
	args: {
		name: v.string(),
		type: v.union(v.literal("manager"), v.literal("worker")),
		role: v.string(),
		model: v.string(),
		color: v.string(),
		threadId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Find an available worker desk (skip manager desk)
		const desks = await ctx.db.query("desks").collect();
		const availableDesk = desks.find((d) => !d.occupiedBy && d.label !== "manager");
		if (!availableDesk) {
			throw new Error("No available desks — all worker desks are occupied");
		}

		// Create the agent
		const agentId = await ctx.db.insert("agents", {
			name: args.name,
			type: args.type,
			role: args.role,
			status: "idle",
			model: args.model,
			deskId: availableDesk._id,
			color: args.color,
			position: availableDesk.position,
			threadId: args.threadId,
			spawnedAt: Date.now(),
		});

		// Assign desk
		await ctx.db.patch(availableDesk._id, { occupiedBy: agentId });

		return agentId;
	},
});

// Despawn an agent and free their desk
export const despawnAgent = mutation({
	args: { agentId: v.id("agents") },
	handler: async (ctx, { agentId }) => {
		const agent = await ctx.db.get(agentId);
		if (!agent) return;

		// Update agent status
		await ctx.db.patch(agentId, {
			status: "despawning",
			completedAt: Date.now(),
		});

		// Free the desk
		if (agent.deskId) {
			await ctx.db.patch(agent.deskId, { occupiedBy: undefined });
		}
	},
});

// Update agent status
export const updateAgentStatus = internalMutation({
	args: {
		agentId: v.id("agents"),
		status: agentStatusValidator,
		reasoning: v.optional(v.string()),
	},
	handler: async (ctx, { agentId, status, reasoning }) => {
		const patch: Record<string, unknown> = { status };
		if (reasoning !== undefined) patch.reasoning = reasoning;
		if (status === "completed" || status === "failed") {
			patch.completedAt = Date.now();
		}
		await ctx.db.patch(agentId, patch);
	},
});

// Internal spawn for use by agent tools (actions -> internal mutations)
export const spawnAgentInternal = internalMutation({
	args: {
		name: v.string(),
		type: v.union(v.literal("manager"), v.literal("worker")),
		role: v.string(),
		model: v.string(),
		color: v.string(),
		threadId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Find an available worker desk (skip manager desk)
		const desks = await ctx.db.query("desks").collect();
		const availableDesk = desks.find((d) => !d.occupiedBy && d.label !== "manager");
		if (!availableDesk) {
			throw new Error("No available desks — all worker desks are occupied");
		}

		const agentId = await ctx.db.insert("agents", {
			name: args.name,
			type: args.type,
			role: args.role,
			status: "idle",
			model: args.model,
			deskId: availableDesk._id,
			color: args.color,
			position: availableDesk.position,
			threadId: args.threadId,
			spawnedAt: Date.now(),
		});

		await ctx.db.patch(availableDesk._id, { occupiedBy: agentId });
		return agentId;
	},
});

// Update desk label
export const updateDeskLabel = mutation({
	args: {
		deskId: v.id("desks"),
		label: v.string(),
	},
	handler: async (ctx, { deskId, label }) => {
		await ctx.db.patch(deskId, { label });
	},
});
