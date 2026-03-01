import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ToolCtx } from "@convex-dev/agent";
import { agentPool } from "../../workpool";
import { roleToModel } from "../models";

// ── Manager-Only Tools (createTool versions for @convex-dev/agent) ──

export const createTaskTool = createTool({
	description:
		"Create a new task in the kanban board. Returns the taskId which you can pass to spawnAgent. Use dependsOn to set task dependencies.",
	inputSchema: z.object({
		title: z.string().describe("Task title"),
		description: z.string().optional().describe("Task details and requirements"),
		estimatedMinutes: z.number().optional().describe("Estimated time in minutes"),
		dependsOn: z
			.array(z.string())
			.optional()
			.describe("Task IDs that must complete before this task can start"),
		parentTaskId: z.string().optional().describe("Parent task ID for sub-task grouping"),
	}),
	execute: async (
		ctx: ToolCtx,
		{ title, description, estimatedMinutes, dependsOn, parentTaskId },
	): Promise<{ taskId: string; title: string; message: string }> => {
		const taskId: Id<"tasks"> = await ctx.runMutation(internal.tasks.mutations.createInternal, {
			title,
			description,
			createdBy: "manager" as const,
			estimatedMinutes,
			dependsOn: dependsOn as Id<"tasks">[] | undefined,
			parentTaskId: parentTaskId as Id<"tasks"> | undefined,
		});
		return { taskId, title, message: `Task "${title}" created.` };
	},
});

export const spawnAgentTool = createTool({
	description:
		"Spawn a new sub-agent at an available desk. If taskId is provided, the agent is automatically assigned and starts working immediately.",
	inputSchema: z.object({
		name: z.string().describe("Agent display name"),
		role: z
			.enum(["coder", "browser", "designer", "researcher", "copywriter", "general"])
			.describe("Agent specialization"),
		color: z.string().describe("Hex color for the agent sprite (e.g. #FF7000, #FD3F29, #FFCB00)"),
		taskId: z.string().optional().describe("Task ID to assign — agent starts working immediately"),
	}),
	execute: async (ctx: ToolCtx, { name, role, color, taskId }) => {
		const model = roleToModel[role] ?? "mistral-small-latest";

		const agentId: Id<"agents"> = await ctx.runMutation(
			internal.office.mutations.spawnAgentInternal,
			{ name, type: "worker" as const, role, model, color },
		);

		if (taskId) {
			const typedTaskId = taskId as Id<"tasks">;
			await ctx.runMutation(internal.tasks.mutations.assignInternal, {
				taskId: typedTaskId,
				agentId,
			});
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
				: `Agent "${name}" (${role}) spawned — waiting for task assignment.`,
		};
	},
});

export const sendToUserTool = createTool({
	description:
		"Send a polished response visible to the user in chat. Use this for status updates, summaries, and answers. Everything else (tool calls, internal reasoning) stays invisible. After handling a user request, always call this with a summary. For background work, only call this if noteworthy.",
	inputSchema: z.object({
		content: z.string().describe("The message text to show the user"),
	}),
	execute: async (ctx: ToolCtx, { content }): Promise<{ success: boolean; message: string }> => {
		await ctx.runMutation(internal.chat.saveAgentReply, {
			content,
			channel: "web" as const,
		});
		return { success: true, message: "Message sent to user." };
	},
});

export const askUserTool = createTool({
	description:
		"Ask the user one or more structured questions with predefined options. Each question has a header, question text, options (label + description), and multiSelect flag. Users can always choose 'Other' for freeform input. NOT available in speech mode.",
	inputSchema: z.object({
		questions: z
			.array(
				z.object({
					question: z.string().describe("The question to ask"),
					header: z.string().describe("Short label, max 12 chars"),
					options: z
						.array(
							z.object({
								label: z.string().describe("Option display text"),
								description: z.string().describe("What this option means"),
							}),
						)
						.min(2)
						.max(4),
					multiSelect: z.boolean().describe("Allow multiple selections"),
				}),
			)
			.min(1)
			.max(4),
		taskId: z.string().optional().describe("Task ID for context"),
	}),
	execute: async (
		ctx: ToolCtx,
		{ questions, taskId },
	): Promise<{ questionId?: string; message: string; error?: string }> => {
		// Check voice session flag
		const voiceRow = await ctx.runQuery(internal.systemConfig.get, {
			key: "voiceSessionActive",
		});
		if (voiceRow === "true") {
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
			return { message: "No active thread found.", error: "no_thread" };
		}

		const questionId = await ctx.runMutation(internal.userQuestions.mutations.createInternal, {
			threadId,
			taskId: taskId as Id<"tasks"> | undefined,
			questions,
		});

		return { questionId, message: "Question sent to user. Waiting for response..." };
	},
});

export const sendMessageToAgentTool = createTool({
	description:
		"Send a message to an agent's mailbox. Use this to assign follow-up tasks to idle agents instead of spawning new ones. Types: 'task' (assign a task), 'directive' (instruction), 'notification' (info), 'result' (forward result). Priority: 0=normal, 1=high, 2=critical (jumps to front of queue).",
	inputSchema: z.object({
		agentId: z.string().describe("Target agent ID"),
		type: z.enum(["task", "directive", "notification", "result"]).describe("Message type"),
		payload: z.string().describe("Message content (JSON or freeform text)"),
		taskId: z.string().optional().describe("Task ID (required for type 'task')"),
		priority: z
			.number()
			.optional()
			.describe("-1=low (background), 0=normal (default), 1=high, 2=critical (always next)"),
	}),
	execute: async (
		ctx: ToolCtx,
		{ agentId, type, payload, taskId, priority },
	): Promise<{ messageId: string; message: string }> => {
		const messageId = await ctx.runMutation(internal.mailbox.mutations.enqueue, {
			recipientId: agentId as Id<"agents">,
			type,
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

export const registerDeliverableTool = createTool({
	description:
		"Register a deliverable produced by a task. Use this after a worker completes a task that produced an output file, document, or URL. The deliverable will appear in the manager dashboard.",
	inputSchema: z.object({
		taskId: z.string().describe("Task ID that produced this deliverable"),
		agentId: z.string().optional().describe("Agent ID that produced this deliverable"),
		type: z
			.enum(["pdf", "html", "markdown", "url", "file", "image"])
			.describe("Type of deliverable"),
		title: z.string().describe("Human-readable title for the deliverable"),
		filename: z.string().optional().describe("Filename if it's a file (e.g. report.pdf)"),
		url: z.string().optional().describe("URL if the deliverable is a link"),
	}),
	execute: async (
		ctx: ToolCtx,
		{ taskId, agentId, type, title, filename, url },
	): Promise<{ deliverableId: string; message: string }> => {
		const deliverableId = await ctx.runMutation(internal.deliverables.mutations.createInternal, {
			taskId: taskId as Id<"tasks">,
			agentId: agentId as Id<"agents"> | undefined,
			type,
			title,
			filename,
			url,
		});
		return {
			deliverableId,
			message: `Deliverable "${title}" (${type}) registered for task.`,
		};
	},
});
