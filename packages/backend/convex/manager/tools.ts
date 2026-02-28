"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

const roleToModel: Record<string, string> = {
	coder: "codestral-latest",
	researcher: "mistral-small-latest",
	copywriter: "mistral-small-latest",
	general: "mistral-small-latest",
};

// Tool action: spawn a sub-agent
export const spawnAgentAction = internalAction({
	args: {
		name: v.string(),
		role: v.string(),
		color: v.string(),
	},
	handler: async (
		ctx,
		{ name, role, color },
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

		return {
			agentId,
			name,
			role,
			model,
			message: `Agent "${name}" (${role}) spawned successfully.`,
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
