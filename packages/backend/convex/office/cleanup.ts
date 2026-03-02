"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { getDaytona, withRetry } from "../sandbox/helpers";

// Stale threshold: agents idle/failed for longer than this get cleaned up
const STALE_THRESHOLD_MS = 5 * 60_000; // 5 minutes
// Stuck working threshold: agents "working" with no sandbox activity for this long
// are considered crashed (workpool job died silently). Max normal runtime is ~37 min
// (4 continuations × ~9 min), so 15 min without ANY activity is a clear signal.
const STUCK_WORKING_THRESHOLD_MS = 15 * 60_000; // 15 minutes

/**
 * Periodic sweep (every 5 min via cron):
 * 1. Despawn stale worker agents (idle/failed past threshold)
 * 2. Recover stuck "working" agents (no sandbox activity for 15+ min)
 * 3. Stop orphaned sandboxes (running but agent is despawning/gone)
 */
export const sweepStaleAgents = internalAction({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();

		// ── Phase 1: Stale idle/failed agents ──
		const staleAgents = await ctx.runQuery(internal.office.queries.getStaleAgents, {
			cutoff: now - STALE_THRESHOLD_MS,
		});

		for (const agent of staleAgents) {
			try {
				await ctx.runMutation(internal.office.mutations.despawnAgentInternal, {
					agentId: agent._id,
				});
				await ctx.runMutation(internal.mailbox.mutations.deadLetterAll, {
					agentId: agent._id,
				});
				await ctx.scheduler.runAfter(0, internal.sandbox.lifecycle.stopAgentSandbox, {
					agentId: agent._id,
				});
				console.log(
					`[sweep] Despawned stale agent "${agent.name}" (${agent.role}, status=${agent.status})`,
				);
			} catch (err) {
				console.warn(
					`[sweep] Failed to despawn agent ${agent._id}: ${err instanceof Error ? err.message : String(err)}`,
				);
			}
		}

		// ── Phase 2: Stuck "working" agents ──
		// These are agents whose workpool job crashed silently — no sandbox activity
		// for 15+ minutes means the job is dead but the agent was never transitioned.
		const stuckAgents = await ctx.runQuery(internal.office.queries.getStuckWorkingAgents, {
			activityCutoff: now - STUCK_WORKING_THRESHOLD_MS,
		});

		for (const agent of stuckAgents) {
			try {
				// Fail the current task so the manager gets notified
				if (agent.currentTaskId) {
					await ctx.runMutation(internal.tasks.mutations.updateStatusInternal, {
						taskId: agent.currentTaskId,
						status: "failed",
					});
				}

				// Clean up continuations
				if (agent.currentTaskId) {
					await ctx.runMutation(internal.agents.continuations.cleanup, {
						taskId: agent.currentTaskId,
					});
				}

				// Log the forced recovery
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId: agent._id,
					type: "stderr" as const,
					content: `[SWEEP] Agent stuck in "working" for ${STUCK_WORKING_THRESHOLD_MS / 60_000}+ min with no sandbox activity. Force-failing and despawning.`,
				});

				// Notify completion handler so manager gets the failure notification
				if (agent.currentTaskId) {
					await ctx.runMutation(internal.agents.onComplete.onSubAgentComplete, {
						agentId: agent._id,
						taskId: agent.currentTaskId,
						success: false,
						error: `Agent "${agent.name}" became unresponsive (no activity for ${STUCK_WORKING_THRESHOLD_MS / 60_000}+ min). The workpool job likely crashed. Task has been marked as failed.`,
					});
				}

				// Despawn and clean up
				await ctx.runMutation(internal.office.mutations.despawnAgentInternal, {
					agentId: agent._id,
				});
				await ctx.runMutation(internal.mailbox.mutations.deadLetterAll, {
					agentId: agent._id,
				});
				await ctx.scheduler.runAfter(0, internal.sandbox.lifecycle.stopAgentSandbox, {
					agentId: agent._id,
				});
				console.log(
					`[sweep] Recovered stuck agent "${agent.name}" (${agent.role}, working for ${Math.round((now - (agent.spawnedAt ?? now)) / 60_000)}min)`,
				);
			} catch (err) {
				console.warn(
					`[sweep] Failed to recover stuck agent ${agent._id}: ${err instanceof Error ? err.message : String(err)}`,
				);
			}
		}

		// ── Phase 2: Orphaned sandboxes ──
		const orphaned = await ctx.runQuery(internal.sandbox.queries.getOrphanedSandboxes, {});

		for (const sb of orphaned) {
			try {
				const daytona = getDaytona();
				const sandbox = await withRetry(() => daytona.findOne({ idOrName: sb.daytonaId }));
				await withRetry(() => daytona.delete(sandbox));
				await ctx.runMutation(internal.sandbox.mutations.updateStatus, {
					sandboxId: sb._id,
					status: "archived",
				});
				console.log(
					`[sweep] Deleted orphaned sandbox ${sb.daytonaId} (agent: ${sb.agentId ?? "none"})`,
				);
			} catch (err) {
				console.warn(
					`[sweep] Failed to delete sandbox ${sb.daytonaId}: ${err instanceof Error ? err.message : String(err)}`,
				);
				// Mark as archived in DB anyway — Daytona sandbox may already be gone
				await ctx
					.runMutation(internal.sandbox.mutations.updateStatus, {
						sandboxId: sb._id,
						status: "archived",
					})
					.catch(() => {});
			}
		}

		const total = staleAgents.length + stuckAgents.length + orphaned.length;
		if (total > 0) {
			console.log(
				`[sweep] Done: ${staleAgents.length} stale, ${stuckAgents.length} stuck, ${orphaned.length} orphaned sandbox(es)`,
			);
		}
	},
});
