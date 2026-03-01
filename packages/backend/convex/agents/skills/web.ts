import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { RunnerCtx } from "../shared/types";

const MAX_OUTPUT = 8000;

function cap(text: string): string {
	if (text.length <= MAX_OUTPUT) return text;
	return text.slice(0, MAX_OUTPUT) + `\n...(truncated, ${text.length} chars total)`;
}

export function createWebSkills(ctx: RunnerCtx, agentId: string) {
	return {
		web_fetch: tool({
			description:
				"Fetch a URL and return its readable text content (HTML is stripped). Useful for reading documentation, APIs, and web pages.",
			inputSchema: z.object({
				url: z.string().describe("The URL to fetch"),
			}),
			execute: async ({ url }) => {
				await ctx.runMutation(internal.logs.mutations.append, {
					agentId,
					type: "tool_call" as const,
					content: `web_fetch: ${url}`,
				});
				const result = await ctx.runAction(internal.sandbox.webFetch.fetchReadable, {
					url,
				});
				return {
					ok: result.ok,
					status: result.status,
					title: result.title,
					text: cap(result.text),
					truncated: result.truncated,
				};
			},
		}),
	};
}
