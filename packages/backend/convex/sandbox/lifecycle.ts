"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { getDaytona, withRetry } from "./helpers";

const SHARED_VOLUME_NAME = "ai-office-workspace";
const SHARED_VOLUME_MOUNT = "/home/company";

type SandboxResult = { sandboxId: Id<"sandbox">; daytonaId: string };

/**
 * Ensure the shared Daytona volume exists (create-if-not-exists).
 * Returns the volume ID for use in sandbox creation.
 */
async function ensureSharedVolume(): Promise<string> {
	const daytona = getDaytona();
	const volume = await withRetry(() => daytona.volume.get(SHARED_VOLUME_NAME, true));
	return volume.id;
}

// Create a new Daytona sandbox for a specific agent, with shared volume
export const createSandbox = internalAction({
	args: {
		agentId: v.optional(v.id("agents")),
		name: v.optional(v.string()),
	},
	handler: async (ctx, { agentId, name }): Promise<SandboxResult> => {
		try {
			const daytona = getDaytona();
			const volumeId = await ensureSharedVolume();

			const sandbox = await withRetry(() =>
				daytona.create(
					{
						language: "typescript",
						volumes: [{ volumeId, mountPath: SHARED_VOLUME_MOUNT }],
						labels: agentId ? { agentId } : undefined,
					},
					{ timeout: 60 },
				),
			);

			const sandboxId: Id<"sandbox"> = await ctx.runMutation(
				internal.sandbox.mutations.ensureSandboxInternal,
				{ daytonaId: sandbox.id, agentId, name },
			);

			await ctx.runMutation(internal.sandbox.mutations.updateStatus, {
				sandboxId,
				status: "running",
			});

			return { sandboxId, daytonaId: sandbox.id };
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			console.error("Failed to create sandbox:", errorMsg);

			// Try to record the error on an existing record
			if (agentId) {
				const existing = await ctx.runQuery(internal.sandbox.queries.getByAgentInternal, {
					agentId,
				});
				if (existing) {
					await ctx.runMutation(internal.sandbox.mutations.updateStatus, {
						sandboxId: existing._id,
						status: "error",
						error: errorMsg,
					});
				}
			}

			throw error;
		}
	},
});

// Start an existing stopped sandbox for a specific agent
export const startSandbox = internalAction({
	args: {
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { agentId }): Promise<{ sandboxId: Id<"sandbox"> }> => {
		const sandboxRecord = agentId
			? await ctx.runQuery(internal.sandbox.queries.getByAgentInternal, { agentId })
			: await ctx.runQuery(internal.sandbox.queries.getInternal);
		if (!sandboxRecord) throw new Error("No sandbox record found");

		try {
			const daytona = getDaytona();
			const sandbox = await withRetry(() => daytona.findOne({ idOrName: sandboxRecord.daytonaId }));
			await withRetry(() => sandbox.start());

			await ctx.runMutation(internal.sandbox.mutations.updateStatus, {
				sandboxId: sandboxRecord._id,
				status: "running",
			});

			return { sandboxId: sandboxRecord._id };
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			console.error("Failed to start sandbox:", errorMsg);

			await ctx.runMutation(internal.sandbox.mutations.updateStatus, {
				sandboxId: sandboxRecord._id,
				status: "error",
				error: errorMsg,
			});

			throw error;
		}
	},
});

// Stop a specific agent's sandbox (preserves disk via volume)
export const stopAgentSandbox = internalAction({
	args: {
		agentId: v.id("agents"),
	},
	handler: async (ctx, { agentId }): Promise<void> => {
		const sandboxRecord = await ctx.runQuery(internal.sandbox.queries.getByAgentInternal, {
			agentId,
		});
		if (!sandboxRecord) return;
		if (sandboxRecord.status !== "running" && sandboxRecord.status !== "creating") return;

		try {
			const daytona = getDaytona();
			const sandbox = await withRetry(() => daytona.findOne({ idOrName: sandboxRecord.daytonaId }));
			await withRetry(() => sandbox.stop());

			await ctx.runMutation(internal.sandbox.mutations.updateStatus, {
				sandboxId: sandboxRecord._id,
				status: "stopped",
			});
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			console.error("Failed to stop agent sandbox:", errorMsg);

			await ctx.runMutation(internal.sandbox.mutations.updateStatus, {
				sandboxId: sandboxRecord._id,
				status: "error",
				error: errorMsg,
			});
		}
	},
});

// Legacy: stop the first sandbox found (backwards compat)
export const stopSandbox = internalAction({
	args: {},
	handler: async (ctx): Promise<void> => {
		const sandboxRecord = await ctx.runQuery(internal.sandbox.queries.getInternal);
		if (!sandboxRecord) return;

		try {
			const daytona = getDaytona();
			const sandbox = await withRetry(() => daytona.findOne({ idOrName: sandboxRecord.daytonaId }));
			await withRetry(() => sandbox.stop());

			await ctx.runMutation(internal.sandbox.mutations.updateStatus, {
				sandboxId: sandboxRecord._id,
				status: "stopped",
			});
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			console.error("Failed to stop sandbox:", errorMsg);

			await ctx.runMutation(internal.sandbox.mutations.updateStatus, {
				sandboxId: sandboxRecord._id,
				status: "error",
				error: errorMsg,
			});

			throw error;
		}
	},
});

// Main entry point: ensure a sandbox is running for a specific agent.
// If already running, return immediately. If stopped, start it. If none, create one.
export const ensureRunning = internalAction({
	args: {
		agentId: v.optional(v.id("agents")),
		name: v.optional(v.string()),
	},
	handler: async (ctx, { agentId, name }): Promise<SandboxResult> => {
		const sandboxRecord = agentId
			? await ctx.runQuery(internal.sandbox.queries.getByAgentInternal, { agentId })
			: await ctx.runQuery(internal.sandbox.queries.getInternal);

		if (!sandboxRecord) {
			return await ctx.runAction(internal.sandbox.lifecycle.createSandbox, { agentId, name });
		}

		if (sandboxRecord.status === "running") {
			return {
				sandboxId: sandboxRecord._id,
				daytonaId: sandboxRecord.daytonaId,
			};
		}

		if (sandboxRecord.status === "stopped" || sandboxRecord.status === "archived") {
			await ctx.runAction(internal.sandbox.lifecycle.startSandbox, { agentId });
			return {
				sandboxId: sandboxRecord._id,
				daytonaId: sandboxRecord.daytonaId,
			};
		}

		if (sandboxRecord.status === "error") {
			return await ctx.runAction(internal.sandbox.lifecycle.createSandbox, { agentId, name });
		}

		// "creating" — already in progress
		return {
			sandboxId: sandboxRecord._id,
			daytonaId: sandboxRecord.daytonaId,
		};
	},
});

// Lazy helper: ensure Computer Use (Xvfb + xfce4 + VNC) is started for an agent's sandbox.
export const ensureComputerUseStarted = internalAction({
	args: {
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { agentId }): Promise<void> => {
		// First ensure the sandbox itself is running
		await ctx.runAction(internal.sandbox.lifecycle.ensureRunning, { agentId });

		const sandboxRecord = agentId
			? await ctx.runQuery(internal.sandbox.queries.getByAgentInternal, { agentId })
			: await ctx.runQuery(internal.sandbox.queries.getInternal);
		if (!sandboxRecord || sandboxRecord.status !== "running") {
			throw new Error("Sandbox is not running after ensureRunning");
		}

		const daytona = getDaytona();
		const sandbox = await withRetry(() => daytona.findOne({ idOrName: sandboxRecord.daytonaId }));

		const status = await withRetry(() => sandbox.computerUse.getStatus());
		if (status.status === "running") {
			return;
		}

		await withRetry(() => sandbox.computerUse.start());
	},
});
