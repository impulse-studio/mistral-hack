"use node";

import type { Sandbox } from "@daytonaio/sdk";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { withRetry } from "./helpers";

const FLUSH_INTERVAL_MS = 500;
const FLUSH_SIZE_BYTES = 2048;

interface StreamingOpts {
	sandbox: Sandbox;
	command: string;
	agentId?: Id<"agents">;
	ctx: ActionCtx;
	sessionId?: string; // reuse existing session, or auto-create
}

/**
 * Run a command in a Daytona session and stream logs to Convex in real-time.
 *
 * Uses `runAsync: true` to fire the command, then opens a WebSocket via
 * `getSessionCommandLogs` to receive stdout/stderr chunks as they are produced.
 * Chunks are buffered (max 500 ms or 2 KB) before being flushed to Convex so
 * the frontend can render incremental output via its existing subscription.
 */
export async function runCommandStreaming(
	opts: StreamingOpts,
): Promise<{ output: string; exitCode: number }> {
	const { sandbox, command, agentId, ctx, sessionId: reuseSessionId } = opts;
	const ownSession = !reuseSessionId;
	const sessionId =
		reuseSessionId ?? `stream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

	if (ownSession) {
		await withRetry(() => sandbox.process.createSession(sessionId));
	}

	try {
		// Fire the command asynchronously — returns immediately with cmdId
		const { cmdId } = await sandbox.process.executeSessionCommand(sessionId, {
			command,
			runAsync: true,
		});

		let stdoutBuf = "";
		let stderrBuf = "";
		let fullOutput = "";
		let flushTimer: ReturnType<typeof setTimeout> | null = null;
		let flushQueue = Promise.resolve();

		const enqueueFlush = () => {
			if (flushTimer) {
				clearTimeout(flushTimer);
				flushTimer = null;
			}

			const stdoutChunk = stdoutBuf;
			const stderrChunk = stderrBuf;
			stdoutBuf = "";
			stderrBuf = "";

			if (!agentId || (!stdoutChunk && !stderrChunk)) return;

			flushQueue = flushQueue.then(async () => {
				if (stdoutChunk) {
					await ctx.runMutation(internal.logs.mutations.append, {
						agentId,
						type: "stdout" as const,
						content: stdoutChunk,
					});
				}
				if (stderrChunk) {
					await ctx.runMutation(internal.logs.mutations.append, {
						agentId,
						type: "stderr" as const,
						content: stderrChunk,
					});
				}
				return undefined;
			});
		};

		const scheduleFlush = () => {
			if (!flushTimer) {
				flushTimer = setTimeout(enqueueFlush, FLUSH_INTERVAL_MS);
			}
		};

		// Stream real-time output — resolves when WebSocket closes (command exits)
		await sandbox.process.getSessionCommandLogs(
			sessionId,
			cmdId,
			(chunk: string) => {
				fullOutput += chunk;
				stdoutBuf += chunk;
				if (Buffer.byteLength(stdoutBuf) >= FLUSH_SIZE_BYTES) {
					enqueueFlush();
				} else {
					scheduleFlush();
				}
			},
			(chunk: string) => {
				fullOutput += chunk;
				stderrBuf += chunk;
				if (Buffer.byteLength(stderrBuf) >= FLUSH_SIZE_BYTES) {
					enqueueFlush();
				} else {
					scheduleFlush();
				}
			},
		);

		// Final flush of any remaining buffered data
		enqueueFlush();
		await flushQueue;

		// Retrieve exit code
		const cmdResult = await sandbox.process.getSessionCommand(sessionId, cmdId);

		return { output: fullOutput, exitCode: cmdResult.exitCode ?? 1 };
	} finally {
		if (ownSession) {
			try {
				await sandbox.process.deleteSession(sessionId);
			} catch {
				// Best-effort session cleanup
			}
		}
	}
}
