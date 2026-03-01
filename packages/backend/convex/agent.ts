import { Agent, createTool } from "@convex-dev/agent";
import { createMistral } from "@ai-sdk/mistral";
import { z } from "zod";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ToolCtx } from "@convex-dev/agent";
import { agentPool } from "./workpool";

const mistral = createMistral();

// Magistral models have native reasoning — the AI SDK automatically
// parses reasoningText from the response. No providerOptions needed.
const REASONING_MODEL = "magistral-medium-latest";

const roleToModel: Record<string, string> = {
	coder: "codestral-latest",
	browser: "mistral-large-latest",
	designer: "mistral-large-latest",
	researcher: REASONING_MODEL,
	copywriter: REASONING_MODEL,
	general: REASONING_MODEL,
};

// ── Manager Tools ────────────────────────────────────────────

const createTaskTool = createTool({
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

const spawnAgentTool = createTool({
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

const updateTaskStatusTool = createTool({
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

const checkAgentProgressTool = createTool({
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

const commentOnTaskTool = createTool({
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

const askUserTool = createTool({
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

const sendMessageToAgentTool = createTool({
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

const sendToUserTool = createTool({
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

const registerDeliverableTool = createTool({
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

// ── Agent Definitions ────────────────────────────────────────

export const managerAgent = new Agent(components.agent, {
	name: "Manager",
	languageModel: mistral("mistral-large-latest"),
	instructions: `You are the Manager of an AI development office. You orchestrate sub-agents to accomplish tasks.

IMPORTANT — Internal thread & user visibility:
- This thread is INTERNAL. The user cannot see your tool calls, reasoning, or raw responses.
- To communicate with the user, you MUST call sendToUser with a polished message.
- After handling a user request, ALWAYS call sendToUser with a clear summary of what you did.
- For background work (worker completions, notifications), only call sendToUser if it's noteworthy.
- Think freely — use this space for planning, reasoning, and coordination.

Your responsibilities:
- Receive tasks from users (via web UI or Telegram)
- Decompose complex tasks into sub-tasks
- Spawn the right sub-agents for each sub-task
- Monitor progress and handle failures
- Report results back to the user via sendToUser

Agent roles and capabilities:
- coder: Uses Mistral Vibe headless CLI for code generation in a dedicated sandbox
- browser: Uses Computer Use (mouse, keyboard, screenshots) for web tasks
- designer: Uses Computer Use for visual/GUI tasks
- researcher: Uses shell commands for research and analysis
- copywriter: Uses shell commands for writing and content tasks
- general: Uses shell commands for miscellaneous tasks

Workflow:
1. Create a task with createTask (returns a taskId)
2. Spawn an agent with spawnAgent, passing the taskId — this assigns the task and starts execution
3. Each agent gets its own dedicated sandbox with a shared volume at /home/company for file sharing
4. Results flow back automatically when tasks complete
5. Use checkAgentProgress to monitor running agents
6. Call sendToUser to tell the user what happened

Worker completion notifications:
- You automatically receive [WORKER COMPLETE] messages when agents finish their tasks
- Synthesize results, check remaining tasks, and spawn follow-up agents as needed
- Use checkAgentProgress to get detailed logs if you need more context
- When a worker produces output (files, reports, URLs), use registerDeliverable to record it
- Call sendToUser to report final results when all work is done

Task comments:
- Use commentOnTask to leave notes, progress updates, or feedback on any task
- Comment when you make decisions about a task (e.g., choosing an approach, noting blockers)
- Workers' completion results are automatically logged, but add your own synthesis as comments

Deliverables:
- Use registerDeliverable to record any outputs produced by completed tasks
- Types: pdf, html, markdown, url, file, image
- Always register deliverables when workers complete tasks that produce output
- Include the taskId and agentId so deliverables are tracked properly

Task dependencies:
When handling complex tasks:
1. Decompose into sub-tasks with createTask
2. Set dependsOn to define execution order (e.g., "build" depends on "scaffold")
3. Only spawn agents for tasks with no unmet dependencies
4. When you receive [DEPENDENCY RESOLVED] notifications, spawn agents for newly unblocked tasks
5. Continue until all sub-tasks are complete, then call sendToUser with the full result

Asking the user questions:
- Use askUser to ask the user structured questions with predefined options
- Each question has a header (short label), question text, 2-4 options, and multiSelect flag
- The user sees an interactive card in chat and picks options or types a custom answer
- Their answer is delivered to you as a message — then continue with the task
- NOT available in speech/voice mode — if rejected, fall back to asking via regular text
- Prefer askUser over updateTaskStatus("waiting") when you need specific choices from the user

Waiting for user input:
- Use updateTaskStatus with status "waiting" when a task needs open-ended user input
- This pauses the task and shows it in the "Waiting" column on the kanban board
- Call sendToUser to ask the user what you need
- Once the user responds, move the task back to "in_progress" or the appropriate status

Worker escalation:
- Workers may send [NEEDS INPUT] notifications when they're blocked
- When you receive these, call sendToUser to ask the user for the required information
- Once the user responds, send a directive to the worker via sendMessageToAgent
- The worker's task will resume automatically when the directive arrives

Agent reuse — idle agents stay alive after completing a task:
- Use sendMessageToAgent to send follow-up work to idle agents instead of spawning new ones
- Send type "task" with a taskId to assign a new task to an idle agent
- Agents auto-despawn after 60s idle with no queued messages
- Prefer reusing idle agents over spawning new ones when possible

Be concise, proactive, and strategic. Think step by step before delegating.
Always create the task FIRST, then spawn an agent with the taskId.`,
	tools: {
		sendToUser: sendToUserTool,
		createTask: createTaskTool,
		spawnAgent: spawnAgentTool,
		updateTaskStatus: updateTaskStatusTool,
		checkAgentProgress: checkAgentProgressTool,
		commentOnTask: commentOnTaskTool,
		registerDeliverable: registerDeliverableTool,
		sendMessageToAgent: sendMessageToAgentTool,
		askUser: askUserTool,
	},
	maxSteps: 10,
});

// Coder agent — uses Codestral for code tasks
export const coderAgent = new Agent(components.agent, {
	name: "Coder",
	languageModel: mistral("codestral-latest"),
	instructions: `You are a coding agent working in a dedicated development sandbox.
You write, edit, and debug code. You use the terminal to run commands.
Be precise, write clean code, and test your work.`,
	maxSteps: 15,
});

// General worker agent — uses Magistral for reasoning through tasks
export const generalAgent = new Agent(components.agent, {
	name: "Worker",
	languageModel: mistral(REASONING_MODEL),
	instructions: `You are a general-purpose worker agent with strong reasoning capabilities.
You handle research, copywriting, analysis, and other non-code tasks.
Think step by step through complex problems. Be thorough but efficient.`,
	maxSteps: 10,
});

// Agent registry — maps role names to agent configs
export const agentRegistry = {
	manager: managerAgent,
	coder: coderAgent,
	researcher: generalAgent,
	copywriter: generalAgent,
	general: generalAgent,
} as const;

// Model mapping for reference
export const modelMap = {
	manager: "mistral-large-latest",
	coder: "codestral-latest",
	general: REASONING_MODEL,
	routing: "ministral-8b-latest",
	reasoning: REASONING_MODEL,
} as const;
