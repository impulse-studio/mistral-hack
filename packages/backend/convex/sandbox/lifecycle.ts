"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { getDaytona, withRetry } from "./helpers";
import { SHARED_WORKSPACE, SANDBOX_GIT_USER, SANDBOX_GIT_EMAIL } from "./constants";

const SHARED_VOLUME_NAME = "ai-office-workspace";
const SHARED_VOLUME_MOUNT = SHARED_WORKSPACE;

/**
 * Provision a sandbox after creation or reconnect:
 * - Configure git identity (fixes "Author identity unknown")
 * - Install Mistral Vibe CLI (coding agent tool)
 * - Install gh CLI if GITHUB_TOKEN is available
 */
async function provisionSandbox(sandbox: {
	process: { executeCommand: (cmd: string) => Promise<unknown> };
}): Promise<void> {
	await sandbox.process.executeCommand(
		`git config --global user.name "${SANDBOX_GIT_USER}" && git config --global user.email "${SANDBOX_GIT_EMAIL}"`,
	);

	// Install Mistral Vibe CLI if not present (best-effort)
	await sandbox.process
		.executeCommand(
			"which vibe > /dev/null 2>&1 || curl -LsSf https://mistral.ai/vibe/install.sh | bash",
		)
		.catch(() => {});

	// Install gh CLI if not present (best-effort — uses passwordless sudo)
	await sandbox.process
		.executeCommand(
			[
				"which gh > /dev/null 2>&1 || {",
				"  GH_VERSION=$(curl -sL https://api.github.com/repos/cli/cli/releases/latest | grep tag_name | cut -d'\"' -f4 | sed 's/v//')",
				'  && curl -sL "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_linux_amd64.tar.gz" | tar xz -C /tmp',
				"  && sudo cp /tmp/gh_${GH_VERSION}_linux_amd64/bin/gh /usr/local/bin/gh",
				"  && sudo chmod +x /usr/local/bin/gh",
				"}",
			].join(" "),
		)
		.catch(() => {
			// Non-fatal — gh may not be needed for every agent
		});

	// Authenticate gh with GITHUB_TOKEN if available
	await sandbox.process
		.executeCommand(
			'test -n "$GITHUB_TOKEN" && echo "$GITHUB_TOKEN" | gh auth login --with-token 2>/dev/null || true',
		)
		.catch(() => {});
}

type SandboxResult = { sandboxId: Id<"sandbox">; daytonaId: string };

/**
 * Ensure the shared Daytona volume exists and is ready.
 * Polls until the volume leaves pending_create state (up to ~30s).
 */
async function ensureSharedVolume(): Promise<string> {
	const daytona = getDaytona();
	const volume = await withRetry(() => daytona.volume.get(SHARED_VOLUME_NAME, true));

	// Wait for volume to be ready (it may be in pending_create right after creation)
	const POLL_INTERVAL_MS = 2000;
	const MAX_POLLS = 15; // 30s total
	for (let i = 0; i < MAX_POLLS; i++) {
		const current = await daytona.volume.get(SHARED_VOLUME_NAME);
		if (current.state === "ready") return current.id;
		console.log(
			`[ensureSharedVolume] Volume state: ${current.state}, waiting... (${i + 1}/${MAX_POLLS})`,
		);
		await new Promise<void>((resolve) => {
			setTimeout(resolve, POLL_INTERVAL_MS);
		});
	}

	// Return the id anyway — the create call will fail with a clear error if still not ready
	return volume.id;
}

// Create a new Daytona sandbox for a specific agent, with shared volume
export const createSandbox = internalAction({
	args: {
		agentId: v.optional(v.id("agents")),
		name: v.optional(v.string()),
		envVars: v.optional(v.any()),
	},
	handler: async (ctx, { agentId, name, envVars }): Promise<SandboxResult> => {
		try {
			const daytona = getDaytona();
			const volumeId = await ensureSharedVolume();

			// Check if a default snapshot is configured
			const snapshotName = await ctx.runQuery(internal.systemConfig.get, {
				key: "default_snapshot",
			});

			const baseParams = {
				language: "typescript" as const,
				volumes: [{ volumeId, mountPath: SHARED_VOLUME_MOUNT }],
				labels: agentId ? { agentId } : undefined,
				autoStopInterval: 0,
				autoDeleteInterval: -1,
				envVars: envVars as Record<string, string> | undefined,
			};

			const sandbox = await withRetry(() =>
				snapshotName
					? daytona.create({ ...baseParams, snapshot: snapshotName }, { timeout: 60 })
					: daytona.create(baseParams, { timeout: 60 }),
			);

			// Provision sandbox (skip heavy installs if snapshot already has them)
			await provisionSandbox(sandbox);

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

// Delete a specific agent's sandbox (data persists on shared volume, frees disk)
export const stopAgentSandbox = internalAction({
	args: {
		agentId: v.id("agents"),
	},
	handler: async (ctx, { agentId }): Promise<void> => {
		const sandboxRecord = await ctx.runQuery(internal.sandbox.queries.getByAgentInternal, {
			agentId,
		});
		if (!sandboxRecord) return;

		try {
			const daytona = getDaytona();
			const sandbox = await withRetry(() => daytona.findOne({ idOrName: sandboxRecord.daytonaId }));
			await withRetry(() => daytona.delete(sandbox));
			console.log(
				`[stopAgentSandbox] Deleted sandbox ${sandboxRecord.daytonaId} for agent ${agentId}`,
			);
		} catch (error) {
			// Sandbox may already be gone — that's fine
			console.warn(
				`[stopAgentSandbox] Could not delete sandbox: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		await ctx.runMutation(internal.sandbox.mutations.updateStatus, {
			sandboxId: sandboxRecord._id,
			status: "archived",
		});
	},
});

// Legacy: delete the first sandbox found (backwards compat)
export const stopSandbox = internalAction({
	args: {},
	handler: async (ctx): Promise<void> => {
		const sandboxRecord = await ctx.runQuery(internal.sandbox.queries.getInternal);
		if (!sandboxRecord) return;

		try {
			const daytona = getDaytona();
			const sandbox = await withRetry(() => daytona.findOne({ idOrName: sandboxRecord.daytonaId }));
			await withRetry(() => daytona.delete(sandbox));
		} catch (error) {
			console.warn(
				`[stopSandbox] Could not delete sandbox: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		await ctx.runMutation(internal.sandbox.mutations.updateStatus, {
			sandboxId: sandboxRecord._id,
			status: "archived",
		});
	},
});

// Main entry point: ensure a sandbox is running for a specific agent.
// If already running, return immediately. If stopped, start it. If none, create one.
export const ensureRunning = internalAction({
	args: {
		agentId: v.optional(v.id("agents")),
		name: v.optional(v.string()),
		envVars: v.optional(v.any()),
	},
	handler: async (ctx, { agentId, name, envVars }): Promise<SandboxResult> => {
		const sandboxRecord = agentId
			? await ctx.runQuery(internal.sandbox.queries.getByAgentInternal, { agentId })
			: await ctx.runQuery(internal.sandbox.queries.getInternal);

		if (!sandboxRecord) {
			return await ctx.runAction(internal.sandbox.lifecycle.createSandbox, {
				agentId,
				name,
				envVars,
			});
		}

		if (sandboxRecord.status === "running") {
			// Verify the sandbox still exists in Daytona (it may have been auto-deleted)
			try {
				const daytona = getDaytona();
				const sandbox = await withRetry(() =>
					daytona.findOne({ idOrName: sandboxRecord.daytonaId }),
				);
				// Re-provision on reconnect (git config, gh CLI)
				await provisionSandbox(sandbox).catch(() => {});
				return {
					sandboxId: sandboxRecord._id,
					daytonaId: sandboxRecord.daytonaId,
				};
			} catch {
				// Sandbox is gone from Daytona — mark as error and recreate
				console.warn(
					`[ensureRunning] Sandbox ${sandboxRecord.daytonaId} not found in Daytona, recreating`,
				);
				await ctx.runMutation(internal.sandbox.mutations.updateStatus, {
					sandboxId: sandboxRecord._id,
					status: "error",
					error: "Sandbox not found in Daytona",
				});
				return await ctx.runAction(internal.sandbox.lifecycle.createSandbox, {
					agentId,
					name,
					envVars,
				});
			}
		}

		if (sandboxRecord.status === "stopped" || sandboxRecord.status === "archived") {
			return await ctx.runAction(internal.sandbox.lifecycle.createSandbox, {
				agentId,
				name,
				envVars,
			});
		}

		if (sandboxRecord.status === "error") {
			return await ctx.runAction(internal.sandbox.lifecycle.createSandbox, {
				agentId,
				name,
				envVars,
			});
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

// Cleanup: delete ALL sandboxes from Daytona and mark DB records as archived.
// Use this to free disk when hitting Daytona tier limits.
export const cleanupAllSandboxes = internalAction({
	args: {},
	handler: async (ctx): Promise<{ deleted: number; errors: number }> => {
		const daytona = getDaytona();
		const result = await daytona.list();
		let deleted = 0;
		let errors = 0;

		for (const sandbox of result.items) {
			try {
				await daytona.delete(sandbox);
				deleted++;
				console.log(`[cleanup] Deleted Daytona sandbox ${sandbox.id}`);
			} catch (error) {
				errors++;
				console.warn(
					`[cleanup] Failed to delete ${sandbox.id}: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		// Mark all DB sandbox records as archived
		const allRecords = await ctx.runQuery(internal.sandbox.queries.getAllSandboxesInternal);
		for (const record of allRecords) {
			if (record.status !== "archived") {
				await ctx.runMutation(internal.sandbox.mutations.updateStatus, {
					sandboxId: record._id,
					status: "archived",
				});
			}
		}

		console.log(`[cleanup] Done: ${deleted} deleted, ${errors} errors`);
		return { deleted, errors };
	},
});
