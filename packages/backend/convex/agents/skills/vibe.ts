import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import { SANDBOX_WORK_DIR } from "../../sandbox/constants";
import type { RunnerCtx } from "../shared/types";

const MAX_OUTPUT = 8000;

function cap(text: string): string {
	if (text.length <= MAX_OUTPUT) return text;
	return text.slice(0, MAX_OUTPUT) + `\n...(truncated, ${text.length} chars total)`;
}

export function createVibeSkills(ctx: RunnerCtx, agentId: string) {
	return {
		install_vibe: tool({
			description:
				"Install Mistral Vibe CLI in the sandbox. Run this BEFORE run_vibe if run_vibe returns 'command not found' (exit 127). Requires network. MISTRAL_API_KEY must be set in the sandbox (it is passed automatically for coding agents).",
			inputSchema: z.object({}),
			execute: async () => {
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "tool_call" as const,
					content: "install_vibe: Installing Mistral Vibe CLI...",
				});
				const result = await ctx.runAction(internal.sandbox.vibe.installVibe, { agentId });
				const output = cap(result.output);
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "tool_result" as const,
					content: `exit=${result.exitCode} | ${output.slice(0, 500)}`,
				});
				return { exitCode: result.exitCode, output };
			},
		}),

		run_vibe: tool({
			description:
				"Run Mistral Vibe headless CLI to generate or scaffold code from a natural language prompt. Best for greenfield projects. Requires vibe to be installed — if you get 'command not found', run install_vibe first. MISTRAL_API_KEY is passed automatically. Uses --auto-approve for non-interactive mode.",
			inputSchema: z.object({
				prompt: z.string().describe("Natural language description of what to build"),
				workingDir: z
					.string()
					.optional()
					.describe(`Working directory (defaults to ${SANDBOX_WORK_DIR})`),
			}),
			execute: async ({ prompt, workingDir }) => {
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "tool_call" as const,
					content: `run_vibe: "${prompt.slice(0, 200)}${prompt.length > 200 ? "..." : ""}"`,
				});
				const result = await ctx.runAction(internal.sandbox.vibe.runVibeHeadless, {
					agentId,
					prompt,
					workingDir,
				});
				return {
					exitCode: result.exitCode,
					output: cap(result.output),
				};
			},
		}),
	};
}
