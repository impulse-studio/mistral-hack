import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import { SANDBOX_WORK_DIR } from "../../sandbox/constants";
import type { RunnerCtx } from "../shared/types";

export function createDeploySkills(ctx: RunnerCtx, agentId: string) {
	return {
		deploy_to_vercel: tool({
			description:
				"Deploy the project to Vercel. Automatically installs and configures the Vercel CLI if needed. Returns the deployment URL on success.",
			inputSchema: z.object({
				path: z.string().optional().describe(`Project directory (defaults to ${SANDBOX_WORK_DIR})`),
				prod: z.boolean().optional().describe("Deploy to production (default: false = preview)"),
			}),
			execute: async ({ path, prod }) => {
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "tool_call" as const,
					content: `deploy_to_vercel: ${path ?? SANDBOX_WORK_DIR}${prod ? " (prod)" : ""}`,
				});
				const result = await ctx.runAction(internal.sandbox.deploy.deployToVercel, {
					path,
					prod,
					agentId,
				});
				return {
					success: result.success,
					deployUrl: result.deployUrl,
					output: result.output,
				};
			},
		}),
	};
}
