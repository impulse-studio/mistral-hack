import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ToolCtx } from "@convex-dev/agent";

// ── Shared Tools (used by multiple agent types) ────────────────

export const updateTaskStatusTool = createTool({
	description: "Update the status of an existing task.",
	inputSchema: z.object({
		taskId: z.string().describe("Task ID"),
		status: z
			.enum(["backlog", "todo", "waiting", "in_progress", "review", "done", "failed"])
			.describe("New status. Use 'waiting' when the task needs user input before it can continue."),
	}),
	execute: async (ctx: ToolCtx, { taskId, status }) => {
		await ctx.runMutation(internal.tasks.mutations.updateStatusInternal, {
			taskId: taskId as Id<"tasks">,
			status,
		});
		return { taskId, status, message: `Task updated to "${status}".` };
	},
});

export const checkAgentProgressTool = createTool({
	description: "Check the current status, task assignment, and recent logs of a sub-agent.",
	inputSchema: z.object({
		agentId: z.string().describe("Agent ID to check"),
	}),
	execute: async (
		ctx: ToolCtx,
		{ agentId },
	): Promise<{
		agentId: string;
		status: string;
		name?: string;
		role?: string;
		currentTask?: { title: string; status: string } | null;
		recentLogs?: Array<{ type: string; content: string; timestamp: number }>;
		message: string;
	}> => {
		const typedAgentId = agentId as Id<"agents">;
		const agent = await ctx.runQuery(internal.office.queries.getAgentInternal, {
			agentId: typedAgentId,
		});
		if (!agent) {
			return { agentId, status: "not_found", message: `Agent ${agentId} not found.` };
		}

		let currentTask: { title: string; status: string } | null = null;
		if (agent.currentTaskId) {
			const task = await ctx.runQuery(internal.tasks.queries.getInternal, {
				taskId: agent.currentTaskId,
			});
			if (task) currentTask = { title: task.title, status: task.status };
		}

		const logs: Array<{ type: string; content: string; timestamp: number }> = await ctx.runQuery(
			internal.agents.queries.getRecentLogs,
			{
				agentId: typedAgentId,
				limit: 10,
			},
		);

		return {
			agentId,
			status: agent.status,
			name: agent.name,
			role: agent.role,
			currentTask,
			recentLogs: logs,
			message: `Agent "${agent.name}" is ${agent.status}.${currentTask ? ` Working on: ${currentTask.title} (${currentTask.status})` : ""}`,
		};
	},
});

export const commentOnTaskTool = createTool({
	description:
		"Add a comment to a task. Use this to leave notes, progress updates, feedback, or context on any task.",
	inputSchema: z.object({
		taskId: z.string().describe("Task ID to comment on"),
		content: z.string().describe("Comment text"),
	}),
	execute: async (
		ctx: ToolCtx,
		{ taskId, content },
	): Promise<{ commentId: string; message: string }> => {
		const commentId = await ctx.runMutation(internal.tasks.comments.addInternal, {
			taskId: taskId as Id<"tasks">,
			content,
			author: "manager" as const,
		});
		return { commentId, message: `Comment added to task.` };
	},
});
