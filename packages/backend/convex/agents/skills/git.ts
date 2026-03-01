import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import { SANDBOX_GIT_USER, SANDBOX_GIT_EMAIL } from "../../sandbox/constants";
import type { RunnerCtx } from "../shared/types";

export function createGitSkills(ctx: RunnerCtx, agentId: string) {
	return {
		git_clone: tool({
			description: "Clone a git repository into the sandbox at the given path.",
			inputSchema: z.object({
				url: z.string().describe("Repository URL (https)"),
				path: z.string().describe("Absolute path to clone into"),
				branch: z.string().optional().describe("Branch to checkout (optional)"),
			}),
			execute: async ({ url, path, branch }) => {
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "tool_call" as const,
					content: `git_clone: ${url} → ${path}${branch ? ` (${branch})` : ""}`,
				});
				const result = await ctx.runAction(internal.sandbox.git.gitClone, {
					url,
					path,
					branch,
					agentId,
				});
				return result;
			},
		}),

		git_commit: tool({
			description:
				"Stage all changes and commit in a git repository. Automatically uses the agent's identity as the commit author. Returns { skipped: true } if there are no changes to commit.",
			inputSchema: z.object({
				path: z.string().describe("Absolute path to the git repository"),
				message: z.string().describe("Commit message"),
			}),
			execute: async ({ path, message }) => {
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "tool_call" as const,
					content: `git_commit: "${message}" in ${path}`,
				});
				// Stage all changes first
				await ctx.runAction(internal.sandbox.git.gitAdd, {
					path,
					files: ["."],
					agentId,
				});
				// gitCommit now checks status internally and returns { skipped: true } if nothing to commit
				const result = await ctx.runAction(internal.sandbox.git.gitCommit, {
					path,
					message,
					author: SANDBOX_GIT_USER,
					email: SANDBOX_GIT_EMAIL,
					agentId,
				});
				return result;
			},
		}),

		git_push: tool({
			description: "Push committed changes to the remote repository.",
			inputSchema: z.object({
				path: z.string().describe("Absolute path to the git repository"),
			}),
			execute: async ({ path }) => {
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "tool_call" as const,
					content: `git_push: ${path}`,
				});
				const result = await ctx.runAction(internal.sandbox.git.gitPush, {
					path,
					agentId,
				});
				return result;
			},
		}),

		git_create_branch: tool({
			description: "Create and checkout a new git branch.",
			inputSchema: z.object({
				path: z.string().describe("Absolute path to the git repository"),
				name: z.string().describe("Branch name"),
			}),
			execute: async ({ path, name }) => {
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "tool_call" as const,
					content: `git_create_branch: ${name} in ${path}`,
				});
				const result = await ctx.runAction(internal.sandbox.git.gitCreateBranch, {
					path,
					name,
					agentId,
				});
				return result;
			},
		}),

		git_status: tool({
			description: "Show the working tree status of a git repository.",
			inputSchema: z.object({
				path: z.string().describe("Absolute path to the git repository"),
			}),
			execute: async ({ path }) => {
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "tool_call" as const,
					content: `git_status: ${path}`,
				});
				const result = await ctx.runAction(internal.sandbox.git.gitStatus, {
					path,
					agentId,
				});
				return result;
			},
		}),
	};
}
