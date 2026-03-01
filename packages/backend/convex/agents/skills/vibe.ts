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
		run_vibe: tool({
			description:
				"Run Mistral Vibe headless CLI to generate or scaffold code from a natural language prompt. Best for greenfield projects and large code generation tasks. The command runs in the specified working directory.",
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
