import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { RunnerCtx } from "../shared/types";

export function createGitHubSkills(ctx: RunnerCtx, agentId: string) {
	return {
		create_pr: tool({
			description:
				"Create a GitHub pull request from the current branch. Requires the code to be committed and pushed first.",
			inputSchema: z.object({
				path: z.string().describe("Absolute path to the git repository"),
				title: z.string().describe("PR title"),
				body: z.string().describe("PR description (markdown)"),
				base: z.string().optional().describe("Base branch (defaults to repo default)"),
			}),
			execute: async ({ path, title, body, base }) => {
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "tool_call" as const,
					content: `create_pr: "${title}"`,
				});
				const result = await ctx.runAction(internal.sandbox.github.createPR, {
					path,
					title,
					body,
					base,
					agentId,
				});
				return {
					success: result.success,
					prUrl: result.prUrl,
					output: result.output,
				};
			},
		}),

		create_issue: tool({
			description: "Create a GitHub issue on a repository.",
			inputSchema: z.object({
				title: z.string().describe("Issue title"),
				body: z.string().describe("Issue body (markdown)"),
				labels: z.array(z.string()).optional().describe("Labels to apply"),
				repo: z
					.string()
					.optional()
					.describe("Repository (owner/repo). Uses current repo if omitted."),
			}),
			execute: async ({ title, body, labels, repo }) => {
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "tool_call" as const,
					content: `create_issue: "${title}"${repo ? ` on ${repo}` : ""}`,
				});
				const result = await ctx.runAction(internal.sandbox.github.createIssue, {
					title,
					body,
					labels,
					repo,
					agentId,
				});
				return {
					success: result.success,
					issueUrl: result.issueUrl,
					output: result.output,
				};
			},
		}),
	};
}
