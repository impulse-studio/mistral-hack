"use node";

import { v } from "convex/values";
import { generateText, tool } from "ai";
import { z } from "zod";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { mistral, MANAGER_MODEL } from "./models";

/**
 * Agent responds to a user comment on a completed/waiting task.
 * The agent LLM decides to either:
 *   1. Reply with a comment on the task (back to the user)
 *   2. Escalate to the manager for further action
 */
export const respondToComment = internalAction({
	args: {
		agentId: v.id("agents"),
		taskId: v.id("tasks"),
		commentPayload: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, { agentId, taskId, commentPayload }) => {
		// Gather context
		const agent = await ctx.runQuery(internal.office.queries.getAgentInternal, { agentId });
		const task = await ctx.runQuery(internal.tasks.queries.getInternal, { taskId });
		if (!agent || !task) return null;

		// Get recent comments for context
		const comments = await ctx.runQuery(internal.tasks.comments.listByTaskInternal, { taskId });
		const recentComments = comments
			.slice(-10)
			.map((c: { author: string; content: string }) => `[${c.author}] ${c.content}`);

		// Get recent agent logs for memory of what the agent did
		const logs = await ctx.runQuery(internal.agents.queries.getRecentLogs, {
			agentId,
			limit: 10,
		});
		const recentLogs = logs.map(
			(l: { type: string; content: string }) => `[${l.type}] ${l.content}`,
		);

		const systemPrompt = `You are "${agent.name}", a ${agent.role} agent in an AI office.
You completed task "${task.title}" (status: ${task.status}).

Task description: ${task.description ?? "No description"}
Task result: ${task.result ?? "No result recorded"}

Your recent work logs:
${recentLogs.join("\n") || "No logs available"}

Recent comments on this task:
${recentComments.join("\n") || "No prior comments"}

A user just left a new comment on this task. You must respond by either:
1. Replying directly with a comment (use replyToUser) — do this for questions you can answer, follow-ups about your work, or simple acknowledgements
2. Escalating to the manager (use escalateToManager) — do this if the comment requires new work, task reassignment, or decisions beyond your scope

You MUST call exactly one of these tools. Be concise and helpful.`;

		let acted = false;

		await generateText({
			model: mistral(agent.model || MANAGER_MODEL),
			system: systemPrompt,
			prompt: commentPayload,
			tools: {
				replyToUser: tool({
					description:
						"Reply to the user with a comment on the task. Use this when you can directly answer or acknowledge the user's comment.",
					inputSchema: z.object({
						content: z.string().describe("Your reply to the user"),
					}),
					execute: async ({ content }) => {
						await ctx.runMutation(internal.tasks.comments.addInternal, {
							taskId,
							content,
							author: "agent" as const,
							agentId,
						});
						acted = true;
						return { success: true, action: "replied" };
					},
				}),
				escalateToManager: tool({
					description:
						"Escalate to the manager when the comment requires new work, task changes, or decisions you cannot make. Include context for the manager.",
					inputSchema: z.object({
						reason: z.string().describe("Why you are escalating and what the manager should do"),
					}),
					execute: async ({ reason }) => {
						const threadId = await ctx.runQuery(internal.systemConfig.get, {
							key: "shared-thread-id",
						});
						if (threadId) {
							const notification = `[AGENT ESCALATION] Agent "${agent.name}" (${agent.role}) on task "${task.title}" received a user comment and is escalating:\nUser comment: ${commentPayload}\nAgent reason: ${reason}`;
							await ctx.runMutation(internal.agents.onComplete.notifyManagerMutation, {
								threadId,
								notification,
							});
						}
						acted = true;
						return { success: true, action: "escalated" };
					},
				}),
			},
		});

		// Log what happened
		const action = acted ? "responded to user comment" : "did not act on comment";
		await ctx.runMutation(internal.logs.mutations.append, {
			agentId,
			type: "status" as const,
			content: `[COMMENT RESPONSE] ${action} on task "${task.title}"`,
		});

		return null;
	},
});
