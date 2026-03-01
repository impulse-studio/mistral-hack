import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { RunnerCtx } from "../shared/types";

const MAX_READ = 10_000;

function capRead(text: string): string {
	if (text.length <= MAX_READ) return text;
	return text.slice(0, MAX_READ) + `\n...(truncated, ${text.length} chars total)`;
}

export function createFilesystemSkills(ctx: RunnerCtx, agentId: string) {
	return {
		read_file: tool({
			description:
				"Read the contents of a file at the given absolute path. Output is capped at 10k characters.",
			inputSchema: z.object({
				path: z.string().describe("Absolute path to the file"),
			}),
			execute: async ({ path }) => {
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "tool_call" as const,
					content: `read_file: ${path}`,
				});
				const result = await ctx.runAction(internal.sandbox.codeExecution.readFile, {
					path,
					agentId,
				});
				return { path: result.path, content: capRead(result.content) };
			},
		}),

		write_file: tool({
			description:
				"Write content to a file at the given absolute path. Creates the file if it doesn't exist, overwrites if it does.",
			inputSchema: z.object({
				path: z.string().describe("Absolute path to the file"),
				content: z.string().describe("Content to write"),
			}),
			execute: async ({ path, content }) => {
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "tool_call" as const,
					content: `write_file: ${path} (${content.length} chars)`,
				});
				const result = await ctx.runAction(internal.sandbox.codeExecution.writeFile, {
					path,
					content,
					agentId,
				});
				return { success: result.success, path: result.path };
			},
		}),

		list_files: tool({
			description:
				"List files and directories at the given path. Returns name, type (file/dir), and size for each entry.",
			inputSchema: z.object({
				path: z.string().describe("Absolute path to the directory"),
			}),
			execute: async ({ path }) => {
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "tool_call" as const,
					content: `list_files: ${path}`,
				});
				const result = await ctx.runAction(internal.sandbox.codeExecution.listFiles, {
					path,
					agentId,
				});
				return { files: result.files };
			},
		}),

		search_files: tool({
			description:
				"Search for files matching a glob/regex pattern under a directory. Returns matching file paths. IMPORTANT: Use the most specific directory possible (e.g., `/home/company/my-project/src` instead of `/home/company`) to avoid slow searches across large directories.",
			inputSchema: z.object({
				path: z
					.string()
					.describe(
						"Base directory to search in. Use the narrowest path possible — avoid searching `/home/company` directly.",
					),
				pattern: z.string().describe("Glob or regex pattern to match file names"),
			}),
			execute: async ({ path, pattern }) => {
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "tool_call" as const,
					content: `search_files: ${pattern} in ${path}`,
				});
				const result = await ctx.runAction(internal.sandbox.codeExecution.searchFiles, {
					path,
					pattern,
					agentId,
				});
				return { files: result.files };
			},
		}),
	};
}
