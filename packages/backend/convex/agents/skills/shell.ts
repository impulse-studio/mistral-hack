import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { RunnerCtx } from "../shared/types";

const MAX_OUTPUT = 8000;

function cap(text: string): string {
	if (text.length <= MAX_OUTPUT) return text;
	return text.slice(0, MAX_OUTPUT) + `\n...(truncated, ${text.length} chars total)`;
}

export function createShellSkills(ctx: RunnerCtx, agentId: string) {
	return {
		execute_command: tool({
			description:
				"Execute a shell command in the sandbox. Each invocation runs in an independent shell — `cd` does NOT persist. Use `cd /path && command` to run in a specific directory. IMPORTANT: Non-interactive — use execute_command_pty for interactive CLIs (create-vite, create-next-app). For npm install, use SANDBOX_LOCAL_WORKSPACE (/home/daytona/projects) to avoid FUSE volume ENOSYS.",
			inputSchema: z.object({
				command: z.string().describe("The shell command to execute"),
			}),
			execute: async ({ command }) => {
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "tool_call" as const,
					content: `execute_command: ${command}`,
				});
				const result = await ctx.runAction(internal.sandbox.execute.runCommand, {
					command,
					agentId,
					stream: true,
				});
				const output = cap(result.result ?? "(no output)");
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "tool_result" as const,
					content: `exit=${result.exitCode} | ${output.slice(0, 500)}`,
				});
				return { exitCode: result.exitCode, output };
			},
		}),

		execute_command_pty: tool({
			description:
				"Execute a command in an interactive PTY (pseudo-terminal). Use for interactive scaffolding CLIs that fail with 'Operation cancelled' in non-TTY mode: npm create vite, create-next-app, create-react-app, etc. Runs in /home/daytona/projects by default (local fs, avoids npm install ENOSYS). Pass cwd to override.",
			inputSchema: z.object({
				command: z
					.string()
					.describe(
						"The shell command (e.g. npm create vite@latest my-app -- --template react-ts)",
					),
				cwd: z.string().optional().describe("Working directory (default: /home/daytona/projects)"),
			}),
			execute: async ({ command, cwd }) => {
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "tool_call" as const,
					content: `execute_command_pty: ${command}`,
				});
				const result = await ctx.runAction(internal.sandbox.execute.runCommandPty, {
					command,
					agentId,
					cwd,
				});
				const output = cap(result.result ?? "(no output)");
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "tool_result" as const,
					content: `exit=${result.exitCode} | ${output.slice(0, 500)}`,
				});
				return { exitCode: result.exitCode, output };
			},
		}),

		run_background: tool({
			description:
				"Start a long-running command in the background (e.g. dev server, watcher). Returns a session ID — the command keeps running after this tool returns.",
			inputSchema: z.object({
				command: z.string().describe("The shell command to run in background"),
			}),
			execute: async ({ command }) => {
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "tool_call" as const,
					content: `run_background: ${command}`,
				});
				const result = await ctx.runAction(internal.sandbox.execute.runBackground, {
					command,
					agentId,
				});
				return { sessionId: result.sessionId, cmdId: result.cmdId };
			},
		}),
	};
}
