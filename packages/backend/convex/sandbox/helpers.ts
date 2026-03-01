"use node";

import { Daytona, type Sandbox } from "@daytonaio/sdk";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

// ---------------------------------------------------------------------------
// Cached Daytona client — single instance per action invocation
// ---------------------------------------------------------------------------

let _daytona: Daytona | undefined;

export function getDaytona(): Daytona {
	if (!_daytona) {
		_daytona = new Daytona();
	}
	return _daytona;
}

// ---------------------------------------------------------------------------
// Running sandbox helper
// ---------------------------------------------------------------------------

export type SandboxWithRecord = {
	sandbox: Sandbox;
	sandboxRecord: { _id: Id<"sandbox">; daytonaId: string; status: string };
};

/**
 * Get a running sandbox for a specific agent.
 * Falls back to legacy singleton lookup if no agentId provided.
 */
export async function getRunning(
	ctx: { runQuery: CallableFunction },
	agentId?: Id<"agents">,
): Promise<SandboxWithRecord> {
	let sandboxRecord;
	if (agentId) {
		sandboxRecord = await ctx.runQuery(internal.sandbox.queries.getByAgentInternal, { agentId });
	} else {
		sandboxRecord = await ctx.runQuery(internal.sandbox.queries.getInternal);
	}

	if (!sandboxRecord || sandboxRecord.status !== "running") {
		throw new Error(
			agentId ? `Sandbox for agent ${agentId} is not running` : "Sandbox is not running",
		);
	}

	const daytona = getDaytona();
	const sandbox = await withRetry(() => daytona.findOne({ idOrName: sandboxRecord.daytonaId }));

	return { sandbox, sandboxRecord };
}

/**
 * Get a running sandbox directly by its Daytona ID.
 * Used by the viewer/template sandbox flow (no agent association needed).
 */
export async function getRunningByDaytonaId(daytonaId: string): Promise<{ sandbox: Sandbox }> {
	const daytona = getDaytona();
	const sandbox = await withRetry(() => daytona.findOne({ idOrName: daytonaId }));
	return { sandbox };
}

// ---------------------------------------------------------------------------
// Activity tracking + logging
// ---------------------------------------------------------------------------

export async function recordAndLog(
	ctx: { runMutation: CallableFunction },
	sandboxId: string,
	agentId: string | undefined,
	type: "command" | "status" | "screenshot" | "stdout" | "stderr",
	content: string,
) {
	await ctx.runMutation(internal.sandbox.mutations.recordActivity, {
		sandboxId,
	});

	if (agentId) {
		await ctx.runMutation(internal.logs.mutations.append, {
			agentId,
			type,
			content,
		});
	}
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export async function recordAndLogScreenshot(
	ctx: {
		runMutation: CallableFunction;
		storage: { store: (blob: Blob) => Promise<Id<"_storage">> };
	},
	sandboxId: string,
	agentId: string | undefined,
	base64Data: string,
	label: string,
	mimeType: "image/png" | "image/jpeg" = "image/png",
) {
	const buffer = Buffer.from(base64Data, "base64");
	const sizeBytes = buffer.byteLength;
	const blob = new Blob([buffer], { type: mimeType });

	await ctx.runMutation(internal.sandbox.mutations.recordActivity, {
		sandboxId,
	});

	if (agentId) {
		const screenshotId = await ctx.storage.store(blob);
		await ctx.runMutation(internal.logs.mutations.appendScreenshotLog, {
			agentId,
			screenshotId,
			content: `${label} (${formatBytes(sizeBytes)})`,
		});
	}

	return sizeBytes;
}

// ---------------------------------------------------------------------------
// Retry with exponential backoff for transient network errors
// ---------------------------------------------------------------------------

const RETRY_DELAYS_MS = [5000, 10_000, 20_000];

const RETRYABLE_CODES = new Set([
	"ECONNRESET",
	"ETIMEDOUT",
	"ECONNREFUSED",
	"EPIPE",
	"EAI_AGAIN",
	"ENOTFOUND",
	"ERR_SOCKET_CONNECTION_TIMEOUT",
]);

function isRetryable(err: unknown): boolean {
	if (!(err instanceof Error)) return false;
	const code = (err as NodeJS.ErrnoException).code;
	if (code && RETRYABLE_CODES.has(code)) return true;
	const msg = err.message.toLowerCase();
	return (
		msg.includes("socket hang up") ||
		msg.includes("network error") ||
		msg.includes("econnreset") ||
		msg.includes("etimedout") ||
		msg.includes("fetch failed")
	);
}

export async function withRetry<T>(
	fn: () => Promise<T>,
	opts?: { maxRetries?: number },
): Promise<T> {
	const maxRetries = opts?.maxRetries ?? RETRY_DELAYS_MS.length;
	let lastError: unknown;
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (err) {
			lastError = err;
			if (attempt < maxRetries && isRetryable(err)) {
				const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]!;
				console.warn(
					`[withRetry] Attempt ${attempt + 1} failed (${(err as Error).message}), retrying in ${delay}ms…`,
				);
				await new Promise<void>((resolve) => {
					setTimeout(resolve, delay);
				});
				continue;
			}
			throw err;
		}
	}
	throw lastError;
}

// ---------------------------------------------------------------------------
// Shell escaping — POSIX single-quote strategy
// ---------------------------------------------------------------------------

export function escapeShellArg(arg: string): string {
	// Wrap in single quotes, escaping any existing single quotes via '\''
	return `'${arg.replace(/'/g, "'\\''")}'`;
}
