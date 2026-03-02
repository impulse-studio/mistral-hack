import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import { SANDBOX_WORK_DIR } from "../../sandbox/constants";
import type { RunnerCtx } from "../shared/types";
import type { Id } from "../../_generated/dataModel";

export function createDeploySkills(ctx: RunnerCtx, agentId: string) {
	return {
		deploy_to_vercel: tool({
			description:
				"Deploy the project to Vercel. Automatically installs and configures the Vercel CLI if needed. Returns the deployment URL on success. The URL is automatically saved as a task deliverable.",
			inputSchema: z.object({
				path: z
					.string()
					.optional()
					.describe(
						`Project root (directory with package.json). Default: ${SANDBOX_WORK_DIR}. For scaffolded apps use /home/daytona/projects/<app-name> or /home/company/<app-name>.`,
					),
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

				// Persist the deploy URL as a deliverable so it's not lost to LLM hallucination.
				// The agent's task result is the LLM's text summary, which may restate the URL
				// incorrectly. This saves the real URL directly from the Vercel CLI output.
				if (result.deployUrl) {
					const agent = await ctx.runQuery(internal.office.queries.getAgentInternal, {
						agentId: agentId as Id<"agents">,
					});
					if (agent?.currentTaskId) {
						await ctx.runMutation(internal.deliverables.mutations.createInternal, {
							taskId: agent.currentTaskId,
							agentId: agentId as Id<"agents">,
							type: "url",
							title: prod ? "Vercel Production Deploy" : "Vercel Preview Deploy",
							url: result.deployUrl,
						});
					}
				}

				return {
					success: result.success,
					deployUrl: result.deployUrl,
					output: result.output,
				};
			},
		}),
	};
}
