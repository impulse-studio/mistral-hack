"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { runCommandStreaming } from "./streamLogs";
import { getRunning, withRetry } from "./helpers";
import { SANDBOX_LOCAL_WORKSPACE } from "./constants";

const COMMAND_TIMEOUT_SECONDS = 300;

// Execute a command in the agent's Daytona sandbox
export const runCommand = internalAction({
	args: {
		command: v.string(),
		agentId: v.optional(v.id("agents")),
		stream: v.optional(v.boolean()),
	},
	handler: async (ctx, { command, agentId, stream }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);

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

		// Non-streaming path — quick internal commands
		const result = await sandbox.process.executeCommand(
			command,
			undefined,
			undefined,
			COMMAND_TIMEOUT_SECONDS,
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

const PTY_TIMEOUT_SECONDS = 300;

export const runCommandPty = internalAction({
	args: {
		command: v.string(),
		agentId: v.optional(v.id("agents")),
		cwd: v.optional(v.string()),
	},
	handler: async (ctx, { command, agentId, cwd }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);
		const workDir = cwd ?? SANDBOX_LOCAL_WORKSPACE;

		if (agentId) {
			await ctx.runMutation(internal.logs.mutations.append, {
				agentId,
				type: "command",
				content: `$ [PTY] ${command}`,
			});
		}

		let fullOutput = "";
		const ptyHandle = await sandbox.process.createPty({
			id: `pty-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			cwd: workDir,
			envs: {
				TERM: "xterm-256color",
				CI: "true",
				DEBIAN_FRONTEND: "noninteractive",
				npm_config_yes: "true",
			},
			cols: 120,
			rows: 30,
			onData: (data: Uint8Array) => {
				const text = new TextDecoder().decode(data);
				fullOutput += text;
				if (agentId) {
					ctx
						.runMutation(internal.logs.mutations.append, {
							agentId,
							type: "stdout",
							content: text,
						})
						.catch(() => {});
				}
			},
		});

		try {
			await ptyHandle.waitForConnection();
			await ptyHandle.sendInput(`(${command}); exit\n`);
			const result = await Promise.race([
				ptyHandle.wait(),
				new Promise<{ exitCode?: number }>((_, reject) => {
					setTimeout(() => reject(new Error("PTY timeout")), PTY_TIMEOUT_SECONDS * 1000);
				}),
			]);
			const exitCode = result?.exitCode ?? 1;
			await ctx.runMutation(internal.sandbox.mutations.recordActivity, {
				sandboxId: sandboxRecord._id,
			});
			return { result: fullOutput, exitCode };
		} finally {
			await ptyHandle.disconnect().catch(() => {});
		}
	},
});

// Run a command as a background process using a session.
export const runBackground = internalAction({
	args: {
		command: v.string(),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { command, agentId }): Promise<{ sessionId: string; cmdId: string }> => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);

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
