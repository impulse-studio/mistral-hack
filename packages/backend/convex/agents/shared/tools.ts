import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ToolCtx } from "@convex-dev/agent";

// ── Document Hub Tools (shared knowledge base) ────────────────

export const createDocumentTool = createTool({
	description:
		"Create a document in the shared Document Hub. Use this to persist research notes, specs, summaries, or reference material that should be accessible to all agents and the user.",
	inputSchema: z.object({
		title: z.string().describe("Document title"),
		content: z.string().describe("Document content (markdown supported)"),
		type: z
			.enum(["note", "reference", "code_doc", "upload"])
			.describe(
				"Document type: note (research/summaries), reference (specs/guidelines), code_doc (API docs)",
			),
		tags: z
			.array(z.string())
			.describe("Tags for categorization (e.g. ['research', 'api', 'frontend'])"),
		taskId: z
			.string()
			.optional()
			.describe("Optional task ID to loosely associate this document with"),
	}),
	execute: async (
		ctx: ToolCtx,
		{ title, content, type, tags, taskId },
	): Promise<{ documentId: string; message: string }> => {
		const documentId = await ctx.runMutation(internal.documents.mutations.createInternal, {
			title,
			content,
			type,
			tags,
			createdBy: "agent" as const,
			taskId: taskId as Id<"tasks"> | undefined,
		});
		return { documentId, message: `Document "${title}" created in the Doc Hub.` };
	},
});

export const searchDocumentsTool = createTool({
	description:
		"Search the Document Hub for existing knowledge. Use this BEFORE starting complex tasks to find relevant context, research, or specs that other agents may have already created.",
	inputSchema: z.object({
		query: z.string().describe("Search keywords"),
		type: z
			.enum(["note", "reference", "code_doc", "upload"])
			.optional()
			.describe("Filter by document type"),
	}),
	execute: async (
		ctx: ToolCtx,
		{ query, type },
	): Promise<{
		documents: Array<{ id: string; title: string; type: string; snippet: string; tags: string[] }>;
		message: string;
	}> => {
		const results = await ctx.runQuery(internal.documents.queries.searchInternal, {
			query,
			type,
			limit: 10,
		});
		const documents = results.map((doc) => ({
			id: doc._id,
			title: doc.title,
			type: doc.type,
			snippet: doc.content ? doc.content.slice(0, 300) : "(no content)",
			tags: doc.tags,
		}));
		return {
			documents,
			message:
				documents.length > 0
					? `Found ${documents.length} document(s) matching "${query}".`
					: `No documents found matching "${query}".`,
		};
	},
});

export const getDocumentTool = createTool({
	description: "Retrieve the full content of a document from the Document Hub by its ID.",
	inputSchema: z.object({
		documentId: z.string().describe("Document ID"),
	}),
	execute: async (
		ctx: ToolCtx,
		{ documentId },
	): Promise<{
		document: { id: string; title: string; content: string; type: string; tags: string[] } | null;
		message: string;
	}> => {
		const doc = await ctx.runQuery(internal.documents.queries.getInternal, {
			documentId: documentId as Id<"documents">,
		});
		if (!doc) {
			return { document: null, message: `Document ${documentId} not found.` };
		}
		return {
			document: {
				id: doc._id,
				title: doc.title,
				content: doc.content ?? "(no content — binary upload)",
				type: doc.type,
				tags: doc.tags,
			},
			message: `Retrieved document "${doc.title}".`,
		};
	},
});

export const listDocumentsTool = createTool({
	description:
		"List all documents in the Document Hub, optionally filtered by type. Returns titles and snippets — use getDocument to read full content.",
	inputSchema: z.object({
		type: z
			.enum(["note", "reference", "code_doc", "upload"])
			.optional()
			.describe("Filter by document type"),
		limit: z.number().optional().describe("Max documents to return (default 20)"),
	}),
	execute: async (
		ctx: ToolCtx,
		{ type, limit },
	): Promise<{
		documents: Array<{ id: string; title: string; type: string; snippet: string; tags: string[] }>;
		message: string;
	}> => {
		const results = await ctx.runQuery(internal.documents.queries.listInternal, {
			type,
			limit: limit ?? 20,
		});
		const documents = results.map((doc) => ({
			id: doc._id,
			title: doc.title,
			type: doc.type,
			snippet: doc.content ? doc.content.slice(0, 200) : "(no content)",
			tags: doc.tags,
		}));
		return {
			documents,
			message: `Found ${documents.length} document(s)${type ? ` of type "${type}"` : ""}.`,
		};
	},
});

// ── Shared Tools (used by multiple agent types) ────────────────

export const updateTaskStatusTool = createTool({
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

export const checkAgentProgressTool = createTool({
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

export const commentOnTaskTool = createTool({
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
