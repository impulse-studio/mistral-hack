"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { agentPool } from "../workpool";
import { roleToModel } from "../agents/models";

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
		dependsOn: v.optional(v.array(v.string())),
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
			dependsOn: args.dependsOn as Id<"tasks">[] | undefined,
			parentTaskId: args.parentTaskId as Id<"tasks"> | undefined,
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

// Tool action: add a comment to a task
export const commentOnTaskAction = internalAction({
	args: {
		taskId: v.string(),
		content: v.string(),
	},
	handler: async (
		ctx,
		{ taskId, content },
	): Promise<{
		commentId: string;
		message: string;
	}> => {
		const commentId = await ctx.runMutation(internal.tasks.comments.addInternal, {
			taskId: taskId as Id<"tasks">,
			content,
			author: "manager",
		});
		return { commentId, message: `Comment added to task.` };
	},
});

// Tool action: send a polished response to the user (visible in chat)
export const sendToUserAction = internalAction({
	args: { content: v.string() },
	handler: async (ctx, { content }): Promise<{ success: boolean; message: string }> => {
		await ctx.runMutation(internal.chat.saveAgentReply, {
			content,
			channel: "web",
		});
		return { success: true, message: "Message sent to user." };
	},
});

// Tool action: send a message to an agent's mailbox
export const sendMessageToAgentAction = internalAction({
	args: {
		agentId: v.string(),
		type: v.string(),
		payload: v.string(),
		taskId: v.optional(v.string()),
		priority: v.optional(v.number()),
	},
	handler: async (
		ctx,
		{ agentId, type, payload, taskId, priority },
	): Promise<{
		messageId: string;
		message: string;
	}> => {
		const messageId = await ctx.runMutation(internal.mailbox.mutations.enqueue, {
			recipientId: agentId as Id<"agents">,
			type: type as "task" | "directive" | "notification" | "result",
			payload,
			taskId: taskId as Id<"tasks"> | undefined,
			priority,
		});
		return {
			messageId,
			message: `Message (${type}) enqueued for agent ${agentId}.`,
		};
	},
});

// Tool action: ask the user structured questions
export const askUserAction = internalAction({
	args: {
		questions: v.array(
			v.object({
				question: v.string(),
				header: v.string(),
				options: v.array(v.object({ label: v.string(), description: v.string() })),
				multiSelect: v.boolean(),
			}),
		),
		taskId: v.optional(v.string()),
	},
	handler: async (
		ctx,
		{ questions, taskId },
	): Promise<{
		questionId?: string;
		message: string;
		error?: string;
	}> => {
		// Check voice session flag
		const voiceFlag = await ctx.runQuery(internal.systemConfig.get, {
			key: "voiceSessionActive",
		});
		if (voiceFlag === "true") {
			return {
				message:
					"Cannot ask structured questions in speech mode. Ask your question via TTS instead.",
				error: "voice_mode_active",
			};
		}

		// Get shared thread ID
		const threadId = await ctx.runQuery(internal.systemConfig.get, {
			key: "shared-thread-id",
		});
		if (!threadId) {
			return {
				message: "No active thread found. Cannot send question.",
				error: "no_thread",
			};
		}

		const questionId = await ctx.runMutation(internal.userQuestions.mutations.createInternal, {
			threadId,
			taskId: taskId as Id<"tasks"> | undefined,
			questions,
		});

		return {
			questionId,
			message: "Question sent to user. Waiting for response...",
		};
	},
});

// Tool action: clone a repo into an agent's sandbox
export const gitCloneAction = internalAction({
	args: {
		agentId: v.string(),
		url: v.string(),
		path: v.optional(v.string()),
		branch: v.optional(v.string()),
	},
	handler: async (
		ctx,
		{ agentId, url, path, branch },
	): Promise<{ success: boolean; path: string; message: string; error?: string }> => {
		const clonePath = path ?? "/home/user/repo";
		try {
			const result = await ctx.runAction(internal.sandbox.git.gitClone, {
				url,
				path: clonePath,
				branch,
				agentId: agentId as Id<"agents">,
			});
			return {
				success: result.success,
				path: result.path,
				message: `Repository ${url} cloned to ${clonePath} in agent ${agentId}'s sandbox.`,
			};
		} catch (err) {
			const error = err instanceof Error ? err.message : String(err);
			return {
				success: false,
				path: clonePath,
				message: `FAILED to clone ${url}: ${error}`,
				error,
			};
		}
	},
});

// Tool action: push committed changes from an agent's sandbox
export const gitPushAction = internalAction({
	args: {
		agentId: v.string(),
		path: v.optional(v.string()),
	},
	handler: async (
		ctx,
		{ agentId, path },
	): Promise<{ success: boolean; message: string; error?: string }> => {
		const repoPath = path ?? "/home/user/repo";
		try {
			await ctx.runAction(internal.sandbox.git.gitPush, {
				path: repoPath,
				agentId: agentId as Id<"agents">,
			});
			return {
				success: true,
				message: `Changes pushed from ${repoPath} in agent ${agentId}'s sandbox.`,
			};
		} catch (err) {
			const error = err instanceof Error ? err.message : String(err);
			return {
				success: false,
				message: `FAILED to push from ${repoPath}: ${error}`,
				error,
			};
		}
	},
});

// Tool action: deploy a project from an agent's sandbox to Vercel
export const deployProjectAction = internalAction({
	args: {
		agentId: v.string(),
		path: v.optional(v.string()),
		prod: v.optional(v.boolean()),
	},
	handler: async (
		ctx,
		{ agentId, path, prod },
	): Promise<{ success: boolean; deployUrl: string | null; message: string; error?: string }> => {
		try {
			const result = await ctx.runAction(internal.sandbox.deploy.deployToVercel, {
				path,
				prod,
				agentId: agentId as Id<"agents">,
			});
			return {
				success: result.success,
				deployUrl: result.deployUrl,
				message: result.deployUrl
					? `Deployed to: ${result.deployUrl}`
					: `Deploy finished (success=${result.success}).`,
			};
		} catch (err) {
			const error = err instanceof Error ? err.message : String(err);
			return {
				success: false,
				deployUrl: null,
				message: `FAILED to deploy: ${error}`,
				error,
			};
		}
	},
});

// Tool action: create a GitHub PR from an agent's sandbox repo
export const createPullRequestAction = internalAction({
	args: {
		agentId: v.string(),
		path: v.string(),
		title: v.string(),
		body: v.string(),
		base: v.optional(v.string()),
	},
	handler: async (
		ctx,
		{ agentId, path, title, body, base },
	): Promise<{ success: boolean; prUrl: string | null; message: string; error?: string }> => {
		try {
			const result = await ctx.runAction(internal.sandbox.github.createPR, {
				path,
				title,
				body,
				base,
				agentId: agentId as Id<"agents">,
			});
			return {
				success: result.success,
				prUrl: result.prUrl,
				message: result.prUrl
					? `PR created: ${result.prUrl}`
					: `PR creation finished (success=${result.success}).`,
			};
		} catch (err) {
			const error = err instanceof Error ? err.message : String(err);
			return {
				success: false,
				prUrl: null,
				message: `FAILED to create PR: ${error}`,
				error,
			};
		}
	},
});

// Tool action: create a GitHub issue
export const createGitHubIssueAction = internalAction({
	args: {
		title: v.string(),
		body: v.string(),
		labels: v.optional(v.array(v.string())),
		repo: v.optional(v.string()),
		agentId: v.optional(v.string()),
	},
	handler: async (
		ctx,
		{ title, body, labels, repo, agentId },
	): Promise<{ success: boolean; issueUrl: string | null; message: string; error?: string }> => {
		try {
			const result = await ctx.runAction(internal.sandbox.github.createIssue, {
				title,
				body,
				labels,
				repo,
				agentId: agentId as Id<"agents"> | undefined,
			});
			return {
				success: result.success,
				issueUrl: result.issueUrl,
				message: result.issueUrl
					? `Issue created: ${result.issueUrl}`
					: `Issue creation finished (success=${result.success}).`,
			};
		} catch (err) {
			const error = err instanceof Error ? err.message : String(err);
			return {
				success: false,
				issueUrl: null,
				message: `FAILED to create issue: ${error}`,
				error,
			};
		}
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
			status: status as
				| "backlog"
				| "todo"
				| "waiting"
				| "in_progress"
				| "review"
				| "done"
				| "failed",
		});

		return {
			taskId,
			status,
			message: `Task ${taskId} updated to "${status}".`,
		};
	},
});
