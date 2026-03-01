"use node";

import { streamHandlerAction, createActionTool } from "convex-durable-agents";
import { z } from "zod";
import { components, internal } from "../_generated/api";
import { mistral, MANAGER_MODEL } from "../agents/models";

// Manager's durable agent handler — survives crashes and restarts
export const handler = streamHandlerAction(components.durable_agents, {
	model: mistral(MANAGER_MODEL),
	system: `You are the Manager of an AI development office.

You orchestrate a team of sub-agents to accomplish tasks:
- Decompose complex tasks into sub-tasks
- Create tasks first, then spawn agents with the taskId to auto-assign and execute
- Monitor progress and handle failures
- Report results back to the user
- Ask the user structured questions when you need input (use askUser)

Agent roles and capabilities:
- coder: Mistral Vibe headless for code gen + git + deploy + GitHub PRs
- browser: Computer Use agent — browses the web, interacts with pages, takes screenshots
- designer: Computer Use agent — designs in GUI apps, takes screenshots
- researcher: Shell commands + git for research, file analysis
- copywriter: Shell commands for writing and content tasks
- general: Shell commands + git + deploy + GitHub for miscellaneous tasks

Computer Use agents (browser, designer) have full desktop GUI control:
- Take screenshots, click, drag, scroll, type, press keyboard shortcuts

Git & GitHub capabilities (coder, researcher, general):
- gitClone: Clone any GitHub repo into an agent's sandbox
- gitPush: Push committed changes from an agent's sandbox
- createPullRequest: Create a PR from an agent's sandbox repo
- createGitHubIssue: Create a GitHub issue

Deployment capabilities (coder, general):
- deployProject: Deploy from an agent's sandbox to Vercel (preview or production)

Workflow:
1. Create a task with createTask
2. Spawn an agent with spawnAgent, passing the taskId — this assigns the task and starts execution
3. The agent works in a shared Daytona sandbox (persistent cloud environment)
4. Results flow back automatically when tasks complete
5. Use gitClone to set up repos, gitPush to publish, deployProject to ship, createPullRequest for code review

Agent reuse — idle agents stay alive after completing a task:
- Use sendMessageToAgent to send follow-up work to idle agents instead of spawning new ones
- Send type "task" with a taskId to assign a new task to an idle agent
- Agents auto-despawn after 60s idle with no queued messages
- Prefer reusing idle agents over spawning new ones when possible

Be concise, proactive, and strategic. Think step by step before delegating.`,
	tools: {
		sendToUser: createActionTool({
			description:
				"Send a polished response visible to the user in chat. Use this for status updates, summaries, and answers. Everything else stays internal.",
			args: z.object({
				content: z.string().describe("The message text to show the user"),
			}),
			handler: internal.manager.tools.sendToUserAction,
		}),
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
					.enum(["backlog", "todo", "waiting", "in_progress", "review", "done", "failed"])
					.describe(
						"New status. Use 'waiting' when the task needs user input before it can continue.",
					),
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
					.describe("-1=low (background), 0=normal (default), 1=high, 2=critical (always next)"),
			}),
			handler: internal.manager.tools.sendMessageToAgentAction,
		}),
		gitClone: createActionTool({
			description:
				"Clone a GitHub repository into an agent's sandbox. The repo is cloned with authentication so private repos work too.",
			args: z.object({
				agentId: z.string().describe("Agent whose sandbox to clone into"),
				url: z.string().describe("Repository URL (e.g. https://github.com/user/repo)"),
				path: z
					.string()
					.optional()
					.describe("Clone destination path (default: /home/daytona/repo)"),
				branch: z.string().optional().describe("Branch to clone (default: main/default)"),
			}),
			handler: internal.manager.tools.gitCloneAction,
		}),
		gitPush: createActionTool({
			description: "Push committed changes from an agent's sandbox to the remote repository.",
			args: z.object({
				agentId: z.string().describe("Agent whose sandbox to push from"),
				path: z.string().optional().describe("Repository path (default: /home/daytona/repo)"),
			}),
			handler: internal.manager.tools.gitPushAction,
		}),
		deployProject: createActionTool({
			description:
				"Deploy a project from an agent's sandbox to Vercel. Installs Vercel CLI if needed, then deploys. Returns the deployment URL.",
			args: z.object({
				agentId: z.string().describe("Agent whose sandbox to deploy from"),
				path: z.string().optional().describe("Project path (default: /home/daytona)"),
				prod: z.boolean().optional().describe("Deploy to production (default: preview)"),
			}),
			handler: internal.manager.tools.deployProjectAction,
		}),
		createPullRequest: createActionTool({
			description:
				"Create a GitHub pull request from an agent's sandbox. The repo must already be cloned and have commits pushed to a branch.",
			args: z.object({
				agentId: z.string().describe("Agent whose sandbox to create PR from"),
				path: z.string().describe("Repository path in sandbox"),
				title: z.string().describe("PR title"),
				body: z.string().describe("PR description"),
				base: z.string().optional().describe("Base branch (default: repo default)"),
			}),
			handler: internal.manager.tools.createPullRequestAction,
		}),
		createGitHubIssue: createActionTool({
			description: "Create a GitHub issue. Can target any repo.",
			args: z.object({
				title: z.string().describe("Issue title"),
				body: z.string().describe("Issue body (markdown)"),
				labels: z.array(z.string()).optional().describe("Labels to apply"),
				repo: z
					.string()
					.optional()
					.describe("Target repo (owner/name). Required if not in a cloned repo."),
				agentId: z.string().optional().describe("Agent whose sandbox to run in (for auth)"),
			}),
			handler: internal.manager.tools.createGitHubIssueAction,
		}),
		askUser: createActionTool({
			description:
				"Ask the user one or more structured questions with predefined options. Each question has a header, question text, options (label + description), and multiSelect flag. Users can always choose 'Other' for freeform input. NOT available in speech mode — use TTS-based questions instead.",
			args: z.object({
				questions: z
					.array(
						z.object({
							question: z.string().describe("The question to ask"),
							header: z.string().describe("Short label, max 12 chars (e.g. 'Auth method')"),
							options: z
								.array(
									z.object({
										label: z.string().describe("Option display text (1-5 words)"),
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
			handler: internal.manager.tools.askUserAction,
		}),
	},
	saveStreamDeltas: true,
});
