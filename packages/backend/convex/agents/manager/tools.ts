import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ToolCtx } from "@convex-dev/agent";
import { agentPool } from "../../workpool";
import { roleToModel } from "../models";
import { SANDBOX_WORK_DIR } from "../../sandbox/constants";

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
			.describe("Task IDs (or exact task titles) that must complete before this task can start"),
		parentTaskId: z
			.string()
			.optional()
			.describe("Parent task ID (or exact title) for sub-task grouping"),
	}),
	execute: async (
		ctx: ToolCtx,
		{ title, description, estimatedMinutes, dependsOn, parentTaskId },
	): Promise<{ taskId: string; title: string; message: string }> => {
		// Resolve dependsOn refs (accepts both task IDs and task titles)
		let resolvedDeps: Id<"tasks">[] | undefined;
		if (dependsOn && dependsOn.length > 0) {
			resolvedDeps = await ctx.runQuery(internal.tasks.queries.resolveTaskRefs, {
				refs: dependsOn,
			});
			if (resolvedDeps.length === 0) resolvedDeps = undefined;
		}

		// Resolve parentTaskId (accepts both task ID and title)
		let resolvedParent: Id<"tasks"> | undefined;
		if (parentTaskId) {
			const resolved = await ctx.runQuery(internal.tasks.queries.resolveTaskRefs, {
				refs: [parentTaskId],
			});
			resolvedParent = resolved[0];
		}

		const taskId: Id<"tasks"> = await ctx.runMutation(internal.tasks.mutations.createInternal, {
			title,
			description,
			createdBy: "manager" as const,
			estimatedMinutes,
			dependsOn: resolvedDeps,
			parentTaskId: resolvedParent,
		});
		return { taskId, title, message: `Task "${title}" created.` };
	},
});

export const spawnAgentTool = createTool({
	description:
		"Spawn a new sub-agent at an available desk. If taskId is provided, the agent is automatically assigned and starts working immediately. Will FAIL if the task is already assigned to another agent, already in progress, or has unmet dependencies.",
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
			try {
				await ctx.runMutation(internal.tasks.mutations.assignInternal, {
					taskId: typedTaskId,
					agentId,
				});
				await agentPool.enqueueAction(ctx, internal.agents.runner.runSubAgent, {
					agentId,
					taskId: typedTaskId,
				});
			} catch (err) {
				// Assignment failed (duplicate, deps unmet, etc.) — despawn the orphan agent
				await ctx.runMutation(internal.office.mutations.despawnAgentInternal, {
					agentId,
				});
				const reason = err instanceof Error ? err.message : String(err);
				return {
					agentId: null,
					name,
					role,
					model,
					message: `FAILED to assign task: ${reason}. Agent was not spawned.`,
				};
			}
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

export const dismissAgentTool = createTool({
	description:
		"Dismiss an idle, completed, or failed agent — frees their desk and stops their sandbox. Use this after a worker completes its task and you don't need it anymore, or to clean up failed agents. Do NOT dismiss agents that are currently working.",
	inputSchema: z.object({
		agentId: z.string().describe("Agent ID to dismiss"),
	}),
	execute: async (ctx: ToolCtx, { agentId }): Promise<{ success: boolean; message: string }> => {
		const typedId = agentId as Id<"agents">;
		const agent = await ctx.runQuery(internal.office.queries.getAgentInternal, {
			agentId: typedId,
		});
		if (!agent) {
			return { success: false, message: `Agent ${agentId} not found.` };
		}
		if (agent.status === "working" || agent.status === "thinking") {
			return {
				success: false,
				message: `Agent "${agent.name}" is currently ${agent.status} — wait for it to finish before dismissing.`,
			};
		}
		if (agent.status === "despawning") {
			return { success: true, message: `Agent "${agent.name}" is already being dismissed.` };
		}
		await ctx.runMutation(internal.office.mutations.despawnAgentInternal, {
			agentId: typedId,
		});
		await ctx.runMutation(internal.mailbox.mutations.deadLetterAll, {
			agentId: typedId,
		});
		await ctx.scheduler.runAfter(0, internal.sandbox.lifecycle.stopAgentSandbox, {
			agentId: typedId,
		});
		return {
			success: true,
			message: `Agent "${agent.name}" (${agent.role}) dismissed — desk freed, sandbox stopping.`,
		};
	},
});

export const sendToUserTool = createTool({
	description:
		"Send a plain-text response visible to the user in chat. Use this for status updates, summaries, and answers. Everything else (tool calls, internal reasoning) stays invisible. After handling a user request, always call this with a summary. For background work, only call this if noteworthy. IMPORTANT: Never include URLs or markdown links unless they came verbatim from a tool result. You do not know the app's URL structure — do not guess or invent links.",
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

// ── Git, Deploy & GitHub Tools ──────────────────────────────────

export const gitCloneTool = createTool({
	description: `Clone a GitHub repository into an agent's sandbox. Use this BEFORE assigning a coding task so the agent works inside the repo. Default path: ${SANDBOX_WORK_DIR}/repo.`,
	inputSchema: z.object({
		agentId: z.string().describe("Agent whose sandbox to clone into"),
		url: z.string().describe("Repository URL (e.g. https://github.com/org/repo)"),
		path: z
			.string()
			.optional()
			.describe(`Clone destination path (default: ${SANDBOX_WORK_DIR}/repo)`),
		branch: z.string().optional().describe("Branch to checkout after clone"),
	}),
	execute: async (
		ctx: ToolCtx,
		{ agentId, url, path, branch },
	): Promise<{ success: boolean; path: string; message: string; error?: string }> => {
		const clonePath = path ?? SANDBOX_WORK_DIR;
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

export const gitPushTool = createTool({
	description:
		"Push committed changes from an agent's sandbox. The coder auto-commits generated code on a feature branch — call this after a coder completes to push the branch upstream.",
	inputSchema: z.object({
		agentId: z.string().describe("Agent whose sandbox to push from"),
		path: z.string().optional().describe(`Repo path in sandbox (default: ${SANDBOX_WORK_DIR})`),
	}),
	execute: async (
		ctx: ToolCtx,
		{ agentId, path },
	): Promise<{ success: boolean; message: string; error?: string }> => {
		const repoPath = path ?? SANDBOX_WORK_DIR;
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
			return { success: false, message: `FAILED to push from ${repoPath}: ${error}`, error };
		}
	},
});

export const createPullRequestTool = createTool({
	description:
		"Create a GitHub pull request from an agent's sandbox repo. Requires gh CLI (auto-installed). The coder auto-creates a feature branch — call this after gitPush.",
	inputSchema: z.object({
		agentId: z.string().describe("Agent whose sandbox contains the repo"),
		path: z.string().describe(`Repo path in sandbox (e.g. ${SANDBOX_WORK_DIR})`),
		title: z.string().describe("PR title"),
		body: z.string().describe("PR description"),
		base: z.string().optional().describe("Base branch (default: repo default branch)"),
	}),
	execute: async (
		ctx: ToolCtx,
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
			return { success: false, prUrl: null, message: `FAILED to create PR: ${error}`, error };
		}
	},
});

export const deployProjectTool = createTool({
	description: "Deploy a project from an agent's sandbox to Vercel. Requires VERCEL_TOKEN env var.",
	inputSchema: z.object({
		agentId: z.string().describe("Agent whose sandbox contains the project"),
		path: z.string().optional().describe("Project path in sandbox"),
		prod: z.boolean().optional().describe("Deploy to production (default: preview)"),
	}),
	execute: async (
		ctx: ToolCtx,
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
			return { success: false, deployUrl: null, message: `FAILED to deploy: ${error}`, error };
		}
	},
});

export const createGitHubIssueTool = createTool({
	description:
		"Create a GitHub issue. Can target any repo if repo arg is provided, otherwise uses the repo in the agent's sandbox.",
	inputSchema: z.object({
		title: z.string().describe("Issue title"),
		body: z.string().describe("Issue body (markdown)"),
		labels: z.array(z.string()).optional().describe("Labels to apply"),
		repo: z
			.string()
			.optional()
			.describe("Target repo (e.g. org/repo). If omitted, uses agent's sandbox repo."),
		agentId: z.string().optional().describe("Agent whose sandbox has gh CLI configured"),
	}),
	execute: async (
		ctx: ToolCtx,
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
			return { success: false, issueUrl: null, message: `FAILED to create issue: ${error}`, error };
		}
	},
});

export const webScreenshotTool = createTool({
	description:
		"Take a screenshot of a web page. Returns an imageUrl you MUST share with the user via sendToUser. The screenshot is stored in Convex storage and optionally registered as an image deliverable. Use this for any screenshot task — do NOT spawn a browser or coder agent for screenshots.",
	inputSchema: z.object({
		url: z.string().describe("Full URL to screenshot (e.g. https://example.com)"),
		taskId: z
			.string()
			.optional()
			.describe("Task ID — if provided, auto-registers as image deliverable"),
		agentId: z.string().optional().describe("Agent ID to associate with the deliverable"),
		width: z.number().optional().describe("Viewport width in px (default: 1280)"),
		height: z.number().optional().describe("Viewport height in px (default: 800)"),
	}),
	execute: async (
		ctx: ToolCtx,
		{ url, taskId, agentId, width, height },
	): Promise<{
		success: boolean;
		storageId?: string;
		imageUrl?: string;
		message: string;
		error?: string;
	}> => {
		try {
			const result = await ctx.runAction(internal.sandbox.webScreenshot.captureScreenshot, {
				url,
				width,
				height,
			});

			// Auto-register as deliverable if taskId provided
			if (taskId) {
				await ctx.runMutation(internal.deliverables.mutations.createInternal, {
					taskId: taskId as Id<"tasks">,
					agentId: agentId as Id<"agents"> | undefined,
					type: "image" as const,
					title: `Screenshot of ${url}`,
					storageId: result.storageId as Id<"_storage">,
					mimeType: "image/png",
					sizeBytes: result.sizeBytes,
				});
			}

			return {
				success: true,
				storageId: result.storageId,
				imageUrl: result.storageUrl ?? undefined,
				message: `Screenshot captured (${result.sizeBytes} bytes). Image URL: ${result.storageUrl ?? "unavailable"}.${taskId ? " Registered as deliverable." : ""}`,
			};
		} catch (err) {
			const error = err instanceof Error ? err.message : String(err);
			return {
				success: false,
				message: `FAILED to capture screenshot of ${url}: ${error}`,
				error,
			};
		}
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
