"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { getDaytona, withRetry } from "../sandbox/helpers";

// Stale threshold: agents idle/failed for longer than this get cleaned up
const STALE_THRESHOLD_MS = 5 * 60_000; // 5 minutes

/**
 * Periodic sweep (every 5 min via cron):
 * 1. Despawn stale worker agents (idle/failed past threshold)
 * 2. Stop orphaned sandboxes (running but agent is despawning/gone)
 */
export const sweepStaleAgents = internalAction({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();

		// ── Phase 1: Stale agents ──
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

		const total = staleAgents.length + orphaned.length;
		if (total > 0) {
			console.log(
				`[sweep] Done: ${staleAgents.length} stale agent(s), ${orphaned.length} orphaned sandbox(es)`,
			);
		}
	},
});
