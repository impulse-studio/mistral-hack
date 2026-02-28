"use node";

import { createMistral } from "@ai-sdk/mistral";
import { streamHandlerAction, createActionTool } from "convex-durable-agents";
import { z } from "zod";
import { components, internal } from "../_generated/api";

const mistral = createMistral();

// Manager's durable agent handler — survives crashes and restarts
export const handler = streamHandlerAction(components.durable_agents, {
	model: mistral("mistral-large-latest"),
	system: `You are the Manager of an AI development office.

You orchestrate a team of sub-agents to accomplish tasks:
- Decompose complex tasks into sub-tasks
- Spawn the right agent type for each sub-task (coder, researcher, copywriter)
- Monitor progress and handle failures
- Report results back to the user

Available tools:
- spawnAgent: Create a new sub-agent with a specific role
- createTask: Create a task and optionally assign it
- updateTaskStatus: Update a task's status

Be concise, proactive, and strategic. Think step by step before delegating.`,
	tools: {
		spawnAgent: createActionTool({
			description:
				"Spawn a new sub-agent at an available desk in the office. Choose the right role for the task.",
			args: z.object({
				name: z.string().describe("Agent display name"),
				role: z
					.enum(["coder", "researcher", "copywriter", "general"])
					.describe("Agent specialization"),
				color: z.string().describe("Hex color for the agent sprite (e.g. #FF7000)"),
			}),
			handler: internal.manager.tools.spawnAgentAction,
		}),
		createTask: createActionTool({
			description:
				"Create a new task in the kanban board. Optionally specify a parent task for sub-task decomposition.",
			args: z.object({
				title: z.string().describe("Task title"),
				description: z.string().optional().describe("Task details"),
				parentTaskId: z.string().optional().describe("Parent task ID for sub-tasks"),
				estimatedMinutes: z.number().optional().describe("Time estimate"),
			}),
			handler: internal.manager.tools.createTaskAction,
		}),
		updateTaskStatus: createActionTool({
			description: "Update the status of an existing task.",
			args: z.object({
				taskId: z.string().describe("Task ID"),
				status: z
					.enum(["backlog", "todo", "in_progress", "review", "done", "failed"])
					.describe("New status"),
			}),
			handler: internal.manager.tools.updateTaskStatusAction,
		}),
	},
	saveStreamDeltas: true,
});
