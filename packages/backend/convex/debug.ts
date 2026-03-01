"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// === Sandbox Lifecycle ===

export const ensureSandboxRunning = action({
	args: {},
	handler: async (ctx): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.lifecycle.ensureRunning, {});
	},
});

export const stopSandbox = action({
	args: {},
	handler: async (ctx) => {
		await ctx.runAction(internal.sandbox.lifecycle.stopSandbox);
		return { success: true };
	},
});

export const cleanupAllSandboxes = action({
	args: {},
	handler: async (ctx): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.lifecycle.cleanupAllSandboxes, {});
	},
});

// === Computer Use ===

export const startComputerUse = action({
	args: {},
	handler: async (ctx): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.startComputerUse, {});
	},
});

export const stopComputerUse = action({
	args: {},
	handler: async (ctx): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.stopComputerUse, {});
	},
});

export const getComputerUseStatus = action({
	args: {},
	handler: async (ctx): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.getComputerUseStatus, {});
	},
});

// === Screenshots ===

export const takeScreenshot = action({
	args: { showCursor: v.optional(v.boolean()) },
	handler: async (ctx, { showCursor }): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.takeScreenshot, {
			showCursor: showCursor ?? true,
		});
	},
});

export const takeCompressedScreenshot = action({
	args: {
		quality: v.optional(v.number()),
		scale: v.optional(v.number()),
	},
	handler: async (ctx, { quality, scale }): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.takeCompressedScreenshot, {
			format: "jpeg",
			quality: quality ?? 60,
			scale: scale ?? 0.5,
			showCursor: true,
		});
	},
});

// === Mouse ===

export const mouseClick = action({
	args: {
		x: v.number(),
		y: v.number(),
		button: v.optional(v.string()),
		double: v.optional(v.boolean()),
	},
	handler: async (ctx, args): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.mouseClick, args);
	},
});

export const mouseMove = action({
	args: { x: v.number(), y: v.number() },
	handler: async (ctx, args): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.mouseMove, args);
	},
});

export const mouseScroll = action({
	args: {
		x: v.number(),
		y: v.number(),
		direction: v.union(v.literal("up"), v.literal("down")),
		amount: v.optional(v.number()),
	},
	handler: async (ctx, args): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.mouseScroll, args);
	},
});

export const getMousePosition = action({
	args: {},
	handler: async (ctx): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.getMousePosition, {});
	},
});

// === Keyboard ===

export const keyboardType = action({
	args: { text: v.string(), delay: v.optional(v.number()) },
	handler: async (ctx, args): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.keyboardType, args);
	},
});

export const keyboardPress = action({
	args: {
		key: v.string(),
		modifiers: v.optional(v.array(v.string())),
	},
	handler: async (ctx, args): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.keyboardPress, args);
	},
});

export const keyboardHotkey = action({
	args: { keys: v.string() },
	handler: async (ctx, args): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.keyboardHotkey, args);
	},
});

// === Shell Execution ===

export const runCommand = action({
	args: { command: v.string() },
	handler: async (ctx, { command }): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.execute.runCommand, { command });
	},
});

// === Display ===

export const getDisplayInfo = action({
	args: {},
	handler: async (ctx): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.getDisplayInfo, {});
	},
});

export const getWindows = action({
	args: {},
	handler: async (ctx): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.getWindows, {});
	},
});

// === Vibe Headless ===

export const runVibe = action({
	args: {
		agentId: v.id("agents"),
		prompt: v.string(),
		workingDir: v.optional(v.string()),
	},
	handler: async (ctx, args): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.vibe.runVibeHeadless, args);
	},
});

// === Filesystem ===

export const writeFile = action({
	args: { path: v.string(), content: v.string() },
	handler: async (ctx, { path, content }): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.codeExecution.writeFile, { path, content });
	},
});

export const readFile = action({
	args: { path: v.string() },
	handler: async (ctx, { path }): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.codeExecution.readFile, { path });
	},
});

export const listFiles = action({
	args: { path: v.string() },
	handler: async (ctx, { path }): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.codeExecution.listFiles, { path });
	},
});

// === Per-agent commands (for debugging browser agent) ===

export const runCommandOnAgent = action({
	args: { agentId: v.id("agents"), command: v.string() },
	handler: async (ctx, { agentId, command }): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.execute.runCommand, {
			command,
			agentId,
			stream: false,
		});
	},
});

export const ensureAgentCU = action({
	args: { agentId: v.id("agents") },
	handler: async (ctx, { agentId }): Promise<unknown> => {
		await ctx.runAction(internal.sandbox.lifecycle.ensureComputerUseStarted, { agentId });
		return { ok: true };
	},
});

export const takeAgentScreenshot = action({
	args: { agentId: v.id("agents") },
	handler: async (ctx, { agentId }): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.takeCompressedScreenshot, {
			format: "jpeg",
			quality: 60,
			showCursor: true,
			agentId,
		});
	},
});

export const getAgentWindows = action({
	args: { agentId: v.id("agents") },
	handler: async (ctx, { agentId }): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.getWindows, { agentId });
	},
});

// === Document Hub ===

export const listDocuments = action({
	args: { type: v.optional(v.string()) },
	handler: async (ctx, { type }): Promise<unknown> => {
		return await ctx.runQuery(internal.documents.queries.listInternal, {
			type: type as "note" | "reference" | "code_doc" | "upload" | undefined,
			limit: 20,
		});
	},
});

export const getDocument = action({
	args: { documentId: v.id("documents") },
	handler: async (ctx, { documentId }): Promise<unknown> => {
		return await ctx.runQuery(internal.documents.queries.getInternal, { documentId });
	},
});

export const searchDocuments = action({
	args: { query: v.string() },
	handler: async (ctx, { query }): Promise<unknown> => {
		return await ctx.runQuery(internal.documents.queries.searchInternal, {
			query,
			limit: 10,
		});
	},
});

export const createDocument = action({
	args: {
		title: v.string(),
		content: v.string(),
		type: v.string(),
		tags: v.array(v.string()),
	},
	handler: async (ctx, { title, content, type, tags }): Promise<unknown> => {
		return await ctx.runMutation(internal.documents.mutations.createInternal, {
			title,
			content,
			type: type as "note" | "reference" | "code_doc",
			tags,
			createdBy: "agent",
		});
	},
});

// === Viewer / Template Sandbox ===

export const createTemplateSandbox = action({
	args: { snapshotName: v.optional(v.string()) },
	handler: async (ctx, { snapshotName }): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.lifecycle.createSandbox, {
			name: "template-viewer",
			snapshotOverride: snapshotName,
		});
	},
});

export const destroyTemplateSandbox = action({
	args: { daytonaId: v.string() },
	handler: async (ctx, { daytonaId }) => {
		await ctx.runAction(internal.sandbox.lifecycle.destroySandboxByDaytonaId, { daytonaId });
		return { success: true };
	},
});

export const viewerStartComputerUse = action({
	args: { daytonaId: v.string() },
	handler: async (ctx, { daytonaId }): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.startComputerUseByDaytonaId, {
			daytonaId,
		});
	},
});

export const viewerTakeScreenshot = action({
	args: {
		daytonaId: v.string(),
		quality: v.optional(v.number()),
		scale: v.optional(v.number()),
	},
	handler: async (ctx, { daytonaId, quality, scale }): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.takeScreenshotByDaytonaId, {
			daytonaId,
			format: "jpeg",
			quality: quality ?? 60,
			scale: scale ?? 1,
			showCursor: true,
		});
	},
});

export const viewerMouseClick = action({
	args: {
		daytonaId: v.string(),
		x: v.number(),
		y: v.number(),
		button: v.optional(v.string()),
		double: v.optional(v.boolean()),
	},
	handler: async (ctx, args): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.mouseClickByDaytonaId, args);
	},
});

export const viewerMouseMove = action({
	args: { daytonaId: v.string(), x: v.number(), y: v.number() },
	handler: async (ctx, args): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.mouseMoveByDaytonaId, args);
	},
});

export const viewerMouseScroll = action({
	args: {
		daytonaId: v.string(),
		x: v.number(),
		y: v.number(),
		direction: v.union(v.literal("up"), v.literal("down")),
		amount: v.optional(v.number()),
	},
	handler: async (ctx, args): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.mouseScrollByDaytonaId, args);
	},
});

export const viewerKeyboardType = action({
	args: { daytonaId: v.string(), text: v.string() },
	handler: async (ctx, args): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.keyboardTypeByDaytonaId, args);
	},
});

export const viewerKeyboardPress = action({
	args: {
		daytonaId: v.string(),
		key: v.string(),
		modifiers: v.optional(v.array(v.string())),
	},
	handler: async (ctx, args): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.keyboardPressByDaytonaId, args);
	},
});

export const viewerGetDisplayInfo = action({
	args: { daytonaId: v.string() },
	handler: async (ctx, { daytonaId }): Promise<unknown> => {
		return await ctx.runAction(internal.sandbox.computerUse.getDisplayInfoByDaytonaId, {
			daytonaId,
		});
	},
});

// === Agent Runner ===

export const runSubAgent = action({
	args: {
		agentId: v.id("agents"),
		taskId: v.id("tasks"),
	},
	handler: async (ctx, args): Promise<unknown> => {
		return await ctx.runAction(internal.agents.runner.runSubAgent, args);
	},
});
