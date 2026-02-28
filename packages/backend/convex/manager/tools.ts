"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { agentPool } from "../workpool";

const roleToModel: Record<string, string> = {
	coder: "codestral-latest",
	browser: "mistral-large-latest",
	designer: "mistral-large-latest",
	researcher: "mistral-small-latest",
	copywriter: "mistral-small-latest",
	general: "mistral-small-latest",
};

// Tool action: spawn a sub-agent and optionally enqueue it on the workpool
export const spawnAgentAction = internalAction({
	args: {
		name: v.string(),
		role: v.string(),
		color: v.string(),
		taskId: v.optional(v.string()),
	},
	handler: async (
		ctx,
		{ name, role, color, taskId },
	): Promise<{
		agentId: Id<"agents">;
		name: string;
		role: string;
		model: string;
		message: string;
	}> => {
		const model = roleToModel[role] ?? "mistral-small-latest";

		const agentId: Id<"agents"> = await ctx.runMutation(
			internal.office.mutations.spawnAgentInternal,
			{
				name,
				type: "worker",
				role,
				model,
				color,
			},
		);

		// If a task is provided, assign it and enqueue the sub-agent runner
		if (taskId) {
			const typedTaskId = taskId as Id<"tasks">;

			// Assign task to agent
			await ctx.runMutation(internal.tasks.mutations.assignInternal, {
				taskId: typedTaskId,
				agentId,
			});

			// Enqueue agent work on the workpool
			await agentPool.enqueueAction(ctx, internal.agents.runner.runSubAgent, {
				agentId,
				taskId: typedTaskId,
			});
		}

		return {
			agentId,
			name,
			role,
			model,
			message: taskId
				? `Agent "${name}" (${role}) spawned and assigned to task.`
				: `Agent "${name}" (${role}) spawned successfully.`,
		};
	},
});

// Tool action: create a task
export const createTaskAction = internalAction({
	args: {
		title: v.string(),
		description: v.optional(v.string()),
		parentTaskId: v.optional(v.string()),
		estimatedMinutes: v.optional(v.number()),
	},
	handler: async (
		ctx,
		args,
	): Promise<{
		taskId: Id<"tasks">;
		title: string;
		message: string;
	}> => {
		const taskId: Id<"tasks"> = await ctx.runMutation(internal.tasks.mutations.createInternal, {
			title: args.title,
			description: args.description,
			createdBy: "manager",
			estimatedMinutes: args.estimatedMinutes,
		});

		return {
			taskId,
			title: args.title,
			message: `Task "${args.title}" created.`,
		};
	},
});

// Tool action: check agent progress
export const checkProgressAction = internalAction({
	args: {
		agentId: v.string(),
	},
	handler: async (
		ctx,
		{ agentId },
	): Promise<{
		agentId: string;
		status: string;
		name: string;
		role: string;
		currentTask: { title: string; status: string } | null;
		recentLogs: Array<{ type: string; content: string; timestamp: number }>;
		message: string;
	}> => {
		const typedAgentId = agentId as Id<"agents">;
		const agent = await ctx.runQuery(internal.office.queries.getAgentInternal, {
			agentId: typedAgentId,
		});
		if (!agent) {
			return {
				agentId,
				status: "not_found",
				name: "",
				role: "",
				currentTask: null,
				recentLogs: [],
				message: `Agent ${agentId} not found.`,
			};
		}

		let currentTask: { title: string; status: string } | null = null;
		if (agent.currentTaskId) {
			const task = await ctx.runQuery(internal.tasks.queries.getInternal, {
				taskId: agent.currentTaskId,
			});
			if (task) {
				currentTask = { title: task.title, status: task.status };
			}
		}

		const logs = await ctx.runQuery(internal.agents.queries.getRecentLogs, {
			agentId: typedAgentId,
			limit: 10,
		});

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

// Tool action: update task status
export const updateTaskStatusAction = internalAction({
	args: {
		taskId: v.string(),
		status: v.string(),
	},
	handler: async (
		ctx,
		{ taskId, status },
	): Promise<{
		taskId: string;
		status: string;
		message: string;
	}> => {
		await ctx.runMutation(internal.tasks.mutations.updateStatusInternal, {
			taskId: taskId as Id<"tasks">,
			status: status as "backlog" | "todo" | "in_progress" | "review" | "done" | "failed",
		});

		return {
			taskId,
			status,
			message: `Task ${taskId} updated to "${status}".`,
		};
	},
});
