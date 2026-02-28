"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { runCommandStreaming } from "./streamLogs";
import { getDaytona, getRunning, withRetry } from "./helpers";

const COMMAND_TIMEOUT_SECONDS = 300;

// Execute a command in the Daytona sandbox
export const runCommand = internalAction({
	args: {
		command: v.string(),
		agentId: v.optional(v.id("agents")),
		stream: v.optional(v.boolean()),
	},
	handler: async (ctx, { command, agentId, stream }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx);

		const useStreaming = (stream ?? true) && !!agentId;

		if (useStreaming) {
			// Log the command prompt before streaming output
			await ctx.runMutation(internal.logs.mutations.append, {
				agentId: agentId!,
				type: "command",
				content: `$ ${command}`,
			});

			const { output, exitCode } = await runCommandStreaming({
				sandbox,
				command,
				agentId,
				ctx,
			});

			// Record activity to extend auto-stop timer
			await ctx.runMutation(internal.sandbox.mutations.recordActivity, {
				sandboxId: sandboxRecord._id,
			});

			return { result: output, exitCode };
		}

		// Non-streaming path — quick internal commands (with timeout + retry)
		const result = await withRetry(() =>
			sandbox.process.executeCommand(command, undefined, undefined, COMMAND_TIMEOUT_SECONDS),
		);

		// Record activity to extend auto-stop timer
		await ctx.runMutation(internal.sandbox.mutations.recordActivity, {
			sandboxId: sandboxRecord._id,
		});

		// Log if linked to an agent
		if (agentId) {
			await ctx.runMutation(internal.logs.mutations.append, {
				agentId,
				type: "command",
				content: `$ ${command}\n${result.result}`,
			});
		}

		return {
			result: result.result,
			exitCode: result.exitCode,
		};
	},
});

// Run a command as a background process using a session.
// Unlike `runCommand`, this fires the command in an async session so it survives
// even if the caller moves on. Ideal for long-running daemons (e.g. `firefox`).
export const runBackground = internalAction({
	args: {
		command: v.string(),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { command, agentId }) => {
		const sandboxRecord = await ctx.runQuery(internal.sandbox.queries.getInternal);
		if (!sandboxRecord || sandboxRecord.status !== "running") {
			throw new Error("Sandbox is not running");
		}

		const daytona = getDaytona();
		const sandbox = await withRetry(() => daytona.findOne({ idOrName: sandboxRecord.daytonaId }));

		const sessionId = `bg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

		await withRetry(() => sandbox.process.createSession(sessionId));

		try {
			const { cmdId } = await sandbox.process.executeSessionCommand(sessionId, {
				command,
				runAsync: true,
			});

			// Record activity
			await ctx.runMutation(internal.sandbox.mutations.recordActivity, {
				sandboxId: sandboxRecord._id,
			});

			if (agentId) {
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "command",
					content: `$ ${command} &  [session=${sessionId}, cmd=${cmdId}]`,
				});
			}

			return { sessionId, cmdId };
		} catch (error) {
			// Cleanup session on failure
			try {
				await sandbox.process.deleteSession(sessionId);
			} catch {
				// Best-effort cleanup
			}
			throw error;
		}
	},
});
