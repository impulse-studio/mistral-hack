import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ── Status & type validators ────────────────────────────

export const sandboxStatusValidator = v.union(
	v.literal("creating"),
	v.literal("running"),
	v.literal("stopped"),
	v.literal("archived"),
	v.literal("error"),
);

export const agentTypeValidator = v.union(v.literal("manager"), v.literal("worker"));

export const agentStatusValidator = v.union(
	v.literal("idle"),
	v.literal("thinking"),
	v.literal("working"),
	v.literal("completed"),
	v.literal("failed"),
	v.literal("despawning"),
);

export const taskStatusValidator = v.union(
	v.literal("backlog"),
	v.literal("todo"),
	v.literal("waiting"),
	v.literal("in_progress"),
	v.literal("review"),
	v.literal("done"),
	v.literal("failed"),
);

export const messageRoleValidator = v.union(
	v.literal("user"),
	v.literal("manager"),
	v.literal("agent"),
	v.literal("system"),
);

export const channelValidator = v.union(v.literal("web"), v.literal("telegram"));

export const logTypeValidator = v.union(
	v.literal("stdout"),
	v.literal("stderr"),
	v.literal("command"),
	v.literal("status"),
	v.literal("tool_call"),
	v.literal("tool_result"),
	v.literal("screenshot"),
);

export const messageMetadataValidator = v.record(v.string(), v.string());

// ── Table field definitions ─────────────────────────────

export const sandboxFields = {
	agentId: v.optional(v.id("agents")), // null = legacy/shared
	name: v.optional(v.string()), // human label (e.g. agent name)
	daytonaId: v.string(),
	status: sandboxStatusValidator,
	autoStopInterval: v.number(), // minutes before auto-stop
	lastActivity: v.number(), // timestamp of last agent activity
	diskUsage: v.optional(v.string()),
	error: v.optional(v.string()),
};

export const agentFields = {
	name: v.string(),
	type: agentTypeValidator,
	role: v.string(), // "coder", "researcher", "copywriter", etc.
	status: agentStatusValidator,
	model: v.string(), // AI SDK model id (e.g. "mistral-large-latest")
	deskId: v.optional(v.id("desks")),
	currentTaskId: v.optional(v.id("tasks")),
	threadId: v.optional(v.string()), // @convex-dev/agent thread id
	color: v.string(), // sprite color for pixel art
	position: v.object({ x: v.number(), y: v.number() }),
	reasoning: v.optional(v.string()), // current thinking/approach
	spawnedAt: v.number(),
	completedAt: v.optional(v.number()),
};

export const taskFields = {
	title: v.string(),
	description: v.optional(v.string()),
	status: taskStatusValidator,
	assignedTo: v.optional(v.id("agents")),
	createdBy: v.union(v.literal("user"), v.literal("manager")),
	parentTaskId: v.optional(v.id("tasks")),
	dependsOn: v.optional(v.array(v.id("tasks"))),
	result: v.optional(v.string()),
	error: v.optional(v.string()),
	estimatedMinutes: v.optional(v.number()),
	createdAt: v.number(),
	startedAt: v.optional(v.number()),
	completedAt: v.optional(v.number()),
};

export const messageFields = {
	content: v.string(),
	role: messageRoleValidator,
	channel: channelValidator,
	agentId: v.optional(v.id("agents")),
	taskId: v.optional(v.id("tasks")),
	metadata: v.optional(messageMetadataValidator),
	createdAt: v.number(),
};

export const agentLogFields = {
	agentId: v.id("agents"),
	type: logTypeValidator,
	content: v.string(),
	screenshotId: v.optional(v.id("_storage")),
	timestamp: v.number(),
};

export const taskCommentAuthorValidator = v.union(
	v.literal("user"),
	v.literal("manager"),
	v.literal("agent"),
	v.literal("system"),
);

export const taskCommentFields = {
	taskId: v.id("tasks"),
	author: taskCommentAuthorValidator,
	agentId: v.optional(v.id("agents")),
	content: v.string(),
	createdAt: v.number(),
};

export const mailboxMessageTypeValidator = v.union(
	v.literal("task"),
	v.literal("directive"),
	v.literal("notification"),
	v.literal("result"),
	v.literal("user_message"),
);

export const mailboxMessageStatusValidator = v.union(
	v.literal("pending"),
	v.literal("processing"),
	v.literal("done"),
	v.literal("failed"),
	v.literal("dead_letter"),
);

export const agentMailboxFields = {
	recipientId: v.id("agents"),
	senderId: v.optional(v.id("agents")),
	type: mailboxMessageTypeValidator,
	status: mailboxMessageStatusValidator,
	payload: v.string(),
	taskId: v.optional(v.id("tasks")),
	priority: v.number(), // -1=low (background), 0=normal, 1=high, 2=critical (always next)
	threadMessageId: v.optional(v.string()), // for manager streamText promptMessageId
	createdAt: v.number(),
	processedAt: v.optional(v.number()),
};

export const agentMailboxDoc = v.object({
	_id: v.id("agentMailbox"),
	_creationTime: v.number(),
	...agentMailboxFields,
});

export const deskFields = {
	position: v.object({ x: v.number(), y: v.number() }),
	label: v.optional(v.string()),
	occupiedBy: v.optional(v.id("agents")),
};

export const documentTypeValidator = v.union(
	v.literal("note"),
	v.literal("reference"),
	v.literal("code_doc"),
	v.literal("upload"),
);

export const documentFields = {
	title: v.string(),
	content: v.optional(v.string()),
	storageId: v.optional(v.id("_storage")),
	mimeType: v.optional(v.string()),
	sizeBytes: v.optional(v.number()),
	type: documentTypeValidator,
	tags: v.array(v.string()),
	createdBy: v.union(v.literal("user"), v.literal("manager"), v.literal("agent")),
	agentId: v.optional(v.id("agents")),
	taskId: v.optional(v.id("tasks")),
	updatedAt: v.number(),
	createdAt: v.number(),
};

export const deliverableTypeValidator = v.union(
	v.literal("pdf"),
	v.literal("html"),
	v.literal("markdown"),
	v.literal("url"),
	v.literal("file"),
	v.literal("image"),
);

export const deliverableFields = {
	taskId: v.id("tasks"),
	agentId: v.optional(v.id("agents")),
	type: deliverableTypeValidator,
	title: v.string(),
	filename: v.optional(v.string()),
	storageId: v.optional(v.id("_storage")),
	url: v.optional(v.string()),
	mimeType: v.optional(v.string()),
	sizeBytes: v.optional(v.number()),
	createdAt: v.number(),
};

export const userQuestionStatusValidator = v.union(
	v.literal("pending"),
	v.literal("answered"),
	v.literal("expired"),
	v.literal("dismissed"),
);

export const userQuestionOptionValidator = v.object({
	label: v.string(),
	description: v.string(),
});

export const userQuestionItemValidator = v.object({
	question: v.string(),
	header: v.string(),
	options: v.array(userQuestionOptionValidator),
	multiSelect: v.boolean(),
});

export const userQuestionAnswerValidator = v.object({
	selectedLabels: v.array(v.string()),
	customText: v.optional(v.string()),
});

export const userQuestionFields = {
	threadId: v.string(),
	taskId: v.optional(v.id("tasks")),
	status: userQuestionStatusValidator,
	questions: v.array(userQuestionItemValidator),
	answers: v.optional(v.array(userQuestionAnswerValidator)),
	createdAt: v.number(),
	answeredAt: v.optional(v.number()),
};

// ── Document validators (for returns) ───────────────────

export const sandboxDoc = v.object({
	_id: v.id("sandbox"),
	_creationTime: v.number(),
	...sandboxFields,
});

export const agentDoc = v.object({
	_id: v.id("agents"),
	_creationTime: v.number(),
	...agentFields,
});

export const taskDoc = v.object({
	_id: v.id("tasks"),
	_creationTime: v.number(),
	...taskFields,
});

export const messageDoc = v.object({
	_id: v.id("messages"),
	_creationTime: v.number(),
	...messageFields,
});

export const agentLogDoc = v.object({
	_id: v.id("agentLogs"),
	_creationTime: v.number(),
	...agentLogFields,
});

export const deskDoc = v.object({
	_id: v.id("desks"),
	_creationTime: v.number(),
	...deskFields,
});

export const taskCommentDoc = v.object({
	_id: v.id("taskComments"),
	_creationTime: v.number(),
	...taskCommentFields,
});

export const deliverableDoc = v.object({
	_id: v.id("deliverables"),
	_creationTime: v.number(),
	...deliverableFields,
});

export const documentDoc = v.object({
	_id: v.id("documents"),
	_creationTime: v.number(),
	...documentFields,
});

export const userQuestionDoc = v.object({
	_id: v.id("userQuestions"),
	_creationTime: v.number(),
	...userQuestionFields,
});

export const integrationConnectionStatusValidator = v.union(
	v.literal("active"),
	v.literal("expired"),
	v.literal("revoked"),
);

export const integrationConnectionFields = {
	userId: v.string(), // better-auth user ID
	toolkitSlug: v.string(), // e.g. "GMAIL", "SLACK"
	title: v.string(), // human label
	status: integrationConnectionStatusValidator,
	accessToken: v.optional(v.string()),
	refreshToken: v.optional(v.string()),
	expiresAt: v.optional(v.number()),
	createdAt: v.number(),
};

export const integrationConnectionDoc = v.object({
	_id: v.id("integrationConnections"),
	_creationTime: v.number(),
	...integrationConnectionFields,
});

export const userPreferencesFields = {
	userId: v.string(), // better-auth user ID
	onboardingCompleted: v.boolean(),
};

export const userPreferencesDoc = v.object({
	_id: v.id("userPreferences"),
	_creationTime: v.number(),
	...userPreferencesFields,
});

// ── Schema ──────────────────────────────────────────────

export default defineSchema({
	// Sandbox state — one per agent, with shared Daytona volume
	sandbox: defineTable(sandboxFields).index("by_status", ["status"]).index("by_agent", ["agentId"]),

	// Agent definitions — Manager + spawned workers
	agents: defineTable(agentFields)
		.index("by_status", ["status"])
		.index("by_desk", ["deskId"])
		.index("by_type", ["type"]),

	// Tasks — kanban-style task management
	tasks: defineTable(taskFields)
		.index("by_status", ["status"])
		.index("by_assignedTo", ["assignedTo"])
		.index("by_parent", ["parentTaskId"]),

	// Messages — multi-channel chat (web + telegram)
	messages: defineTable(messageFields)
		.index("by_channel", ["channel"])
		.index("by_createdAt", ["createdAt"])
		.index("by_channel_time", ["channel", "createdAt"]),

	// Agent terminal output — streaming logs
	agentLogs: defineTable(agentLogFields)
		.index("by_agent", ["agentId"])
		.index("by_agent_time", ["agentId", "timestamp"]),

	// Desk assignments — physical locations in the pixel-art office
	desks: defineTable(deskFields).index("by_occupiedBy", ["occupiedBy"]),

	// System config — simple key-value store (shared thread ID, etc.)
	systemConfig: defineTable({
		key: v.string(),
		value: v.string(),
	}).index("by_key", ["key"]),

	// Task comments — threaded discussion on tasks
	taskComments: defineTable(taskCommentFields)
		.index("by_task", ["taskId"])
		.index("by_task_time", ["taskId", "createdAt"]),

	// Agent mailbox — per-agent message queue (actor model)
	agentMailbox: defineTable(agentMailboxFields)
		.index("by_recipient_status", ["recipientId", "status"])
		.index("by_recipient", ["recipientId"]),

	// Deliverables — files and outputs produced by agents
	deliverables: defineTable(deliverableFields)
		.index("by_task", ["taskId"])
		.index("by_agent", ["agentId"]),

	// User questions — structured questions from manager to user
	userQuestions: defineTable(userQuestionFields).index("by_thread_status", ["threadId", "status"]),

	// User preferences — per-user settings (onboarding, etc.)
	userPreferences: defineTable(userPreferencesFields).index("by_user", ["userId"]),

	// Integration connections — OAuth connections to external services
	integrationConnections: defineTable(integrationConnectionFields)
		.index("by_user", ["userId"])
		.index("by_user_toolkit", ["userId", "toolkitSlug"]),

	// Documents — shared knowledge base (agent notes, specs, uploads)
	documents: defineTable(documentFields)
		.index("by_type", ["type"])
		.index("by_updatedAt", ["updatedAt"])
		.index("by_agent", ["agentId"])
		.index("by_task", ["taskId"])
		.searchIndex("search_title_content", {
			searchField: "title",
			filterFields: ["type"],
		}),
});
