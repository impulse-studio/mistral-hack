import { ConvexError, v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { agentStatusValidator } from "../schema";

// Initialize desks for the pixel-art office (8 worker + 1 manager)
export const initDesks = mutation({
	args: {},
	returns: v.array(v.id("desks")),
	handler: async (ctx) => {
		// Check if desks already exist
		const existing = await ctx.db.query("desks").collect();
		if (existing.length > 0) return existing.map((d) => d._id);

		// 8 worker desks in a 2x4 grid
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
	returns: v.id("agents"),
	handler: async (ctx) => {
		// Check if a manager agent already exists
		const existing = await ctx.db
			.query("agents")
			.withIndex("by_type", (q) => q.eq("type", "manager"))
			.first();
		if (existing) return existing._id;

		// Find or create the manager desk
		const desks = await ctx.db.query("desks").collect();
		let mgrDesk = desks.find((d) => d.label === "manager");
		if (!mgrDesk) {
			// Auto-init desks if missing
			if (desks.length === 0) {
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
				for (const position of workerPositions) {
					await ctx.db.insert("desks", { position });
				}
			}
			const mgrId = await ctx.db.insert("desks", { position: { x: 0, y: 0 }, label: "manager" });
			mgrDesk = (await ctx.db.get(mgrId))!;
		}

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
	returns: v.id("agents"),
	handler: async (ctx, args) => {
		let desks = await ctx.db.query("desks").collect();

		// Auto-init desks if the table is empty
		if (desks.length === 0) {
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
			for (const position of workerPositions) {
				await ctx.db.insert("desks", { position });
			}
			await ctx.db.insert("desks", { position: { x: 0, y: 0 }, label: "manager" });
			desks = await ctx.db.query("desks").collect();
		}

		// Find an available worker desk (skip manager desk)
		let availableDesk = desks.find((d) => !d.occupiedBy && d.label !== "manager");

		// If no desk available, try to free desks from stale agents (despawning/completed/failed)
		if (!availableDesk) {
			const staleStatuses = new Set(["despawning", "completed", "failed"]);
			for (const desk of desks) {
				if (desk.occupiedBy && desk.label !== "manager") {
					const occupant = await ctx.db.get(desk.occupiedBy);
					if (!occupant || staleStatuses.has(occupant.status)) {
						await ctx.db.patch(desk._id, { occupiedBy: undefined });
						if (!availableDesk) {
							availableDesk = { ...desk, occupiedBy: undefined };
						}
					}
				}
			}
		}

		if (!availableDesk) {
			const occupied = desks.filter((d) => d.occupiedBy && d.label !== "manager").length;
			const total = desks.filter((d) => d.label !== "manager").length;
			throw new ConvexError(
				`No available desks — ${occupied}/${total} worker desks are occupied by active agents`,
			);
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
	returns: v.null(),
	handler: async (ctx, { agentId }) => {
		const agent = await ctx.db.get(agentId);
		if (!agent || agent.status === "despawning") return;

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
	returns: v.null(),
	handler: async (ctx, { agentId, status, reasoning }) => {
		const agent = await ctx.db.get(agentId);
		if (!agent || agent.status === status) return;

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
	returns: v.id("agents"),
	handler: async (ctx, args) => {
		let desks = await ctx.db.query("desks").collect();

		// Auto-init desks if the table is empty (same logic as ensureManager)
		if (desks.length === 0) {
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
			for (const position of workerPositions) {
				await ctx.db.insert("desks", { position });
			}
			await ctx.db.insert("desks", { position: { x: 0, y: 0 }, label: "manager" });
			desks = await ctx.db.query("desks").collect();
		}

		// Find an available worker desk (skip manager desk)
		let availableDesk = desks.find((d) => !d.occupiedBy && d.label !== "manager");

		// If no desk available, try to free desks from stale agents (despawning/completed/failed)
		if (!availableDesk) {
			const staleStatuses = new Set(["despawning", "completed", "failed"]);
			for (const desk of desks) {
				if (desk.occupiedBy && desk.label !== "manager") {
					const occupant = await ctx.db.get(desk.occupiedBy);
					if (!occupant || staleStatuses.has(occupant.status)) {
						await ctx.db.patch(desk._id, { occupiedBy: undefined });
						if (!availableDesk) {
							availableDesk = { ...desk, occupiedBy: undefined };
						}
					}
				}
			}
		}

		if (!availableDesk) {
			const occupied = desks.filter((d) => d.occupiedBy && d.label !== "manager").length;
			const total = desks.filter((d) => d.label !== "manager").length;
			throw new ConvexError(
				`No available desks — ${occupied}/${total} worker desks are occupied by active agents`,
			);
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

// Internal version of despawnAgent for use by mailbox idle timeout
export const despawnAgentInternal = internalMutation({
	args: { agentId: v.id("agents") },
	returns: v.null(),
	handler: async (ctx, { agentId }) => {
		const agent = await ctx.db.get(agentId);
		if (!agent || agent.status === "despawning") return null;

		await ctx.db.patch(agentId, {
			status: "despawning",
			completedAt: Date.now(),
		});

		if (agent.deskId) {
			await ctx.db.patch(agent.deskId, { occupiedBy: undefined });
		}
		return null;
	},
});

// Full session reset — despawn workers, clear tasks, chat, deliverables, logs, mailbox
export const resetAllWorkers = mutation({
	args: {},
	returns: v.number(),
	handler: async (ctx) => {
		const now = Date.now();

		// ── 1. Despawn all worker agents ──
		const workers = await ctx.db
			.query("agents")
			.withIndex("by_type", (q) => q.eq("type", "worker"))
			.collect();
		const toReset = workers.filter((a) => a.status !== "despawning");

		for (const agent of toReset) {
			await ctx.db.patch(agent._id, {
				status: "despawning",
				completedAt: now,
				currentTaskId: undefined,
			});
			if (agent.deskId) {
				await ctx.db.patch(agent.deskId, { occupiedBy: undefined });
			}
		}

		// ── 2. Delete all mailbox messages (all agents) ──
		const allMailbox = await ctx.db.query("agentMailbox").collect();
		for (const msg of allMailbox) {
			await ctx.db.delete(msg._id);
		}

		// ── 3. Delete all agent logs + screenshots ──
		const allLogs = await ctx.db.query("agentLogs").collect();
		for (const log of allLogs) {
			if (log.screenshotId) {
				await ctx.storage.delete(log.screenshotId);
			}
			await ctx.db.delete(log._id);
		}

		// ── 4. Delete all tasks + comments + deliverables ──
		const allTasks = await ctx.db.query("tasks").collect();
		for (const task of allTasks) {
			const comments = await ctx.db
				.query("taskComments")
				.withIndex("by_task", (q) => q.eq("taskId", task._id))
				.collect();
			for (const comment of comments) {
				await ctx.db.delete(comment._id);
			}
			await ctx.db.delete(task._id);
		}

		const allDeliverables = await ctx.db.query("deliverables").collect();
		for (const d of allDeliverables) {
			if (d.storageId) {
				await ctx.storage.delete(d.storageId);
			}
			await ctx.db.delete(d._id);
		}

		// ── 5. Delete all chat messages ──
		const allMessages = await ctx.db.query("messages").collect();
		for (const msg of allMessages) {
			await ctx.db.delete(msg._id);
		}

		// ── 6. Delete all user questions ──
		const allQuestions = await ctx.db.query("userQuestions").collect();
		for (const q of allQuestions) {
			await ctx.db.delete(q._id);
		}

		// ── 7. Delete agent-created documents ──
		const agentDocs = await ctx.db.query("documents").collect();
		for (const doc of agentDocs) {
			if (doc.createdBy === "agent") {
				if (doc.storageId) {
					await ctx.storage.delete(doc.storageId);
				}
				await ctx.db.delete(doc._id);
			}
		}

		// ── 8. Reset shared thread (new one created on next message) ──
		const threadConfig = await ctx.db
			.query("systemConfig")
			.withIndex("by_key", (q) => q.eq("key", "shared-thread-id"))
			.first();
		if (threadConfig) {
			await ctx.db.delete(threadConfig._id);
		}

		return toReset.length;
	},
});

// Update desk label
export const updateDeskLabel = mutation({
	args: {
		deskId: v.id("desks"),
		label: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, { deskId, label }) => {
		await ctx.db.patch(deskId, { label });
	},
});
