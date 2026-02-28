import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
);

export default defineSchema({
	// Sandbox state — shared persistent Daytona computer
	sandbox: defineTable({
		daytonaId: v.string(),
		status: sandboxStatusValidator,
		autoStopInterval: v.number(), // minutes before auto-stop
		lastActivity: v.number(), // timestamp of last agent activity
		diskUsage: v.optional(v.string()),
		error: v.optional(v.string()),
	}).index("by_status", ["status"]),

	// Agent definitions — Manager + spawned workers
	agents: defineTable({
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
	})
		.index("by_status", ["status"])
		.index("by_desk", ["deskId"])
		.index("by_type", ["type"]),

	// Tasks — kanban-style task management
	tasks: defineTable({
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
	})
		.index("by_status", ["status"])
		.index("by_assignedTo", ["assignedTo"])
		.index("by_parent", ["parentTaskId"]),

	// Messages — multi-channel chat (web + telegram)
	messages: defineTable({
		content: v.string(),
		role: messageRoleValidator,
		channel: channelValidator,
		agentId: v.optional(v.id("agents")),
		taskId: v.optional(v.id("tasks")),
		metadata: v.optional(v.any()),
		createdAt: v.number(),
	})
		.index("by_channel", ["channel"])
		.index("by_createdAt", ["createdAt"])
		.index("by_channel_time", ["channel", "createdAt"]),

	// Agent terminal output — streaming logs
	agentLogs: defineTable({
		agentId: v.id("agents"),
		type: logTypeValidator,
		content: v.string(),
		timestamp: v.number(),
	})
		.index("by_agent", ["agentId"])
		.index("by_agent_time", ["agentId", "timestamp"]),

	// Desk assignments — physical locations in the pixel-art office
	desks: defineTable({
		position: v.object({ x: v.number(), y: v.number() }),
		label: v.optional(v.string()),
		occupiedBy: v.optional(v.id("agents")),
	}).index("by_occupiedBy", ["occupiedBy"]),
});
