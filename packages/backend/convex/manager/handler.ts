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
- Create tasks first, then spawn agents with the taskId to auto-assign and execute
- Monitor progress and handle failures
- Report results back to the user

Agent roles and capabilities:
- coder: Uses Mistral Vibe headless CLI for code generation in the sandbox
- browser: Uses Computer Use (mouse, keyboard, screenshots) for browser automation and web tasks
- designer: Uses Computer Use for visual/GUI tasks — design verification, UI testing, visual QA
- researcher: Uses shell commands for research, file analysis, and information gathering
- copywriter: Uses shell commands for writing and content tasks
- general: Uses shell commands for miscellaneous tasks

Computer Use agents (browser, designer) have full desktop GUI control:
- Take screenshots to see the screen
- Click, drag, scroll with the mouse
- Type text and press keyboard shortcuts
- Inspect windows and display info
- Record sessions for review

Workflow:
1. Create a task with createTask
2. Spawn an agent with spawnAgent, passing the taskId — this assigns the task and starts execution
3. The agent works in a shared Daytona sandbox (persistent cloud environment)
4. Results flow back automatically when tasks complete

Agent reuse — idle agents stay alive after completing a task:
- Use sendMessageToAgent to send follow-up work to idle agents instead of spawning new ones
- Send type "task" with a taskId to assign a new task to an idle agent
- Agents auto-despawn after 60s idle with no queued messages
- Prefer reusing idle agents over spawning new ones when possible

Be concise, proactive, and strategic. Think step by step before delegating.`,
	tools: {
		spawnAgent: createActionTool({
			description:
				"Spawn a new sub-agent at an available desk. If taskId is provided, the agent is automatically assigned to the task and execution begins via the workpool.",
			args: z.object({
				name: z.string().describe("Agent display name"),
				role: z
					.enum(["coder", "browser", "designer", "researcher", "copywriter", "general"])
					.describe("Agent specialization"),
				color: z.string().describe("Hex color for the agent sprite (e.g. #FF7000)"),
				taskId: z.string().optional().describe("Task ID to assign and start working on"),
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
		checkAgentProgress: createActionTool({
			description: "Check the current status and recent logs of a sub-agent.",
			args: z.object({
				agentId: z.string().describe("Agent ID to check"),
			}),
			handler: internal.manager.tools.checkProgressAction,
		}),
		commentOnTask: createActionTool({
			description:
				"Add a comment to a task. Use this to leave notes, progress updates, feedback, or context.",
			args: z.object({
				taskId: z.string().describe("Task ID to comment on"),
				content: z.string().describe("Comment text"),
			}),
			handler: internal.manager.tools.commentOnTaskAction,
		}),
		sendMessageToAgent: createActionTool({
			description:
				"Send a message to an agent's mailbox. Use this to assign follow-up tasks to idle agents instead of spawning new ones. Types: 'task' (assign a task), 'directive' (instruction), 'notification' (info), 'result' (forward result). Priority: 0=normal, 1=high, 2=critical (always next).",
			args: z.object({
				agentId: z.string().describe("Target agent ID"),
				type: z.enum(["task", "directive", "notification", "result"]).describe("Message type"),
				payload: z.string().describe("Message content (JSON or freeform text)"),
				taskId: z.string().optional().describe("Task ID (required for type 'task')"),
				priority: z
					.number()
					.optional()
					.describe("0=normal (default), 1=high, 2=critical (always processed next)"),
			}),
			handler: internal.manager.tools.sendMessageToAgentAction,
		}),
	},
	saveStreamDeltas: true,
});
