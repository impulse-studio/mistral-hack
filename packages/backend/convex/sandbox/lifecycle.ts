"use node";

import { Daytona } from "@daytonaio/sdk";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

const getDaytona = () => new Daytona();

type SandboxResult = { sandboxId: Id<"sandbox">; daytonaId: string };

// Create a new Daytona sandbox and register it in the DB
export const createSandbox = internalAction({
	args: {},
	handler: async (ctx): Promise<SandboxResult> => {
		try {
			const daytona = getDaytona();
			const sandbox = await daytona.create({ language: "typescript" });

			const sandboxId: Id<"sandbox"> = await ctx.runMutation(
				internal.sandbox.mutations.ensureSandboxInternal,
				{ daytonaId: sandbox.id },
			);

			await ctx.runMutation(internal.sandbox.mutations.updateStatus, {
				sandboxId,
				status: "running",
			});

			return { sandboxId, daytonaId: sandbox.id };
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			console.error("Failed to create sandbox:", errorMsg);

			// Try to record the error if we have a sandbox record
			const existing = await ctx.runQuery(internal.sandbox.queries.getInternal);
			if (existing) {
				await ctx.runMutation(internal.sandbox.mutations.updateStatus, {
					sandboxId: existing._id,
					status: "error",
					error: errorMsg,
				});
			}

			throw error;
		}
	},
});

// Start an existing stopped sandbox
export const startSandbox = internalAction({
	args: {},
	handler: async (ctx): Promise<{ sandboxId: Id<"sandbox"> }> => {
		const sandboxRecord = await ctx.runQuery(internal.sandbox.queries.getInternal);
		if (!sandboxRecord) throw new Error("No sandbox record found");

		try {
			const daytona = getDaytona();
			const sandbox = await daytona.findOne({
				idOrName: sandboxRecord.daytonaId,
			});
			await sandbox.start();

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

// Stop and remove a sandbox
export const stopSandbox = internalAction({
	args: {},
	handler: async (ctx): Promise<void> => {
		const sandboxRecord = await ctx.runQuery(internal.sandbox.queries.getInternal);
		if (!sandboxRecord) return;

		try {
			const daytona = getDaytona();
			const sandbox = await daytona.findOne({
				idOrName: sandboxRecord.daytonaId,
			});
			await sandbox.stop();

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

// Main entry point: ensure a sandbox is running
// If already running, return immediately. If stopped, start it. If none exists, create one.
export const ensureRunning = internalAction({
	args: {},
	handler: async (ctx): Promise<SandboxResult> => {
		const sandboxRecord = await ctx.runQuery(internal.sandbox.queries.getInternal);

		if (!sandboxRecord) {
			// No sandbox exists — create one
			return await ctx.runAction(internal.sandbox.lifecycle.createSandbox);
		}

		if (sandboxRecord.status === "running") {
			// Already running
			return {
				sandboxId: sandboxRecord._id,
				daytonaId: sandboxRecord.daytonaId,
			};
		}

		if (sandboxRecord.status === "stopped" || sandboxRecord.status === "archived") {
			// Start the existing sandbox
			await ctx.runAction(internal.sandbox.lifecycle.startSandbox);
			return {
				sandboxId: sandboxRecord._id,
				daytonaId: sandboxRecord.daytonaId,
			};
		}

		if (sandboxRecord.status === "error") {
			// Try to recreate
			return await ctx.runAction(internal.sandbox.lifecycle.createSandbox);
		}

		// "creating" — already in progress, return what we have
		return {
			sandboxId: sandboxRecord._id,
			daytonaId: sandboxRecord.daytonaId,
		};
	},
});

// Lazy helper: ensure Computer Use (Xvfb + xfce4 + VNC) is started.
// Checks status first; starts only if not already running.
export const ensureComputerUseStarted = internalAction({
	args: {},
	handler: async (ctx): Promise<void> => {
		// First ensure the sandbox itself is running
		await ctx.runAction(internal.sandbox.lifecycle.ensureRunning);

		const sandboxRecord = await ctx.runQuery(internal.sandbox.queries.getInternal);
		if (!sandboxRecord || sandboxRecord.status !== "running") {
			throw new Error("Sandbox is not running after ensureRunning");
		}

		const daytona = getDaytona();
		const sandbox = await daytona.findOne({
			idOrName: sandboxRecord.daytonaId,
		});

		const status = await sandbox.computerUse.getStatus();
		if (status.status === "running") {
			return; // Already started
		}

		await sandbox.computerUse.start();
	},
});
