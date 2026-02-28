import { Agent, createTool } from "@convex-dev/agent";
import { createMistral } from "@ai-sdk/mistral";
import { z } from "zod";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ToolCtx } from "@convex-dev/agent";
import { agentPool } from "./workpool";

const mistral = createMistral();

const roleToModel: Record<string, string> = {
	coder: "codestral-latest",
	browser: "mistral-large-latest",
	designer: "mistral-large-latest",
	researcher: "mistral-small-latest",
	copywriter: "mistral-small-latest",
	general: "mistral-small-latest",
};

// ── Manager Tools ────────────────────────────────────────────

const createTaskTool = createTool({
	description:
		"Create a new task in the kanban board. Returns the taskId which you can pass to spawnAgent.",
	inputSchema: z.object({
		title: z.string().describe("Task title"),
		description: z.string().optional().describe("Task details and requirements"),
		estimatedMinutes: z.number().optional().describe("Estimated time in minutes"),
	}),
	execute: async (
		ctx: ToolCtx,
		{ title, description, estimatedMinutes },
	): Promise<{ taskId: string; title: string; message: string }> => {
		const taskId: Id<"tasks"> = await ctx.runMutation(internal.tasks.mutations.createInternal, {
			title,
			description,
			createdBy: "manager" as const,
			estimatedMinutes,
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
			.enum(["backlog", "todo", "in_progress", "review", "done", "failed"])
			.describe("New status"),
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

// ── Agent Definitions ────────────────────────────────────────

export const managerAgent = new Agent(components.agent, {
	name: "Manager",
	languageModel: mistral("mistral-large-latest"),
	instructions: `You are the Manager of an AI development office. You orchestrate sub-agents to accomplish tasks.

Your responsibilities:
- Receive tasks from users (via web UI or Telegram)
- Decompose complex tasks into sub-tasks
- Spawn the right sub-agents for each sub-task
- Monitor progress and handle failures
- Report results back to the user

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

Be concise, proactive, and strategic. Think step by step before delegating.
Always create the task FIRST, then spawn an agent with the taskId.`,
	tools: {
		createTask: createTaskTool,
		spawnAgent: spawnAgentTool,
		updateTaskStatus: updateTaskStatusTool,
		checkAgentProgress: checkAgentProgressTool,
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

// General worker agent — fast and cheap for misc tasks
export const generalAgent = new Agent(components.agent, {
	name: "Worker",
	languageModel: mistral("mistral-small-latest"),
	instructions: `You are a general-purpose worker agent.
You handle research, copywriting, analysis, and other non-code tasks.
Be thorough but efficient.`,
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
	general: "mistral-small-latest",
	routing: "ministral-8b-latest",
	reasoning: "magistral-medium-latest",
} as const;
