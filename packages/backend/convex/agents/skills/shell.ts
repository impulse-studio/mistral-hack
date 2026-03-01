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
				"Execute a shell command in the sandbox. Each invocation runs in an independent shell — `cd` does NOT persist. Use `cd /path && command` to run in a specific directory. Prefer combining related operations into a single command with && or ;. IMPORTANT: The shell has NO TTY — interactive prompts will fail. Never use interactive scaffolding CLIs (create-vite, create-next-app, npm init without -y). Use `run_vibe` or `write_file` for project scaffolding instead.",
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
