"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { getRunning, recordAndLog, recordAndLogScreenshot, withRetry } from "./helpers";

// --- Lifecycle ---

export const startComputerUse = internalAction({
	args: { agentId: v.optional(v.id("agents")) },
	handler: async (ctx, { agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);
		const result = await withRetry(() => sandbox.computerUse.start());

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"status",
			`Computer Use started: ${result.message ?? "OK"}`,
		);

		return { message: result.message, status: result.status };
	},
});

export const stopComputerUse = internalAction({
	args: { agentId: v.optional(v.id("agents")) },
	handler: async (ctx, { agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);
		const result = await withRetry(() => sandbox.computerUse.stop());

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"status",
			`Computer Use stopped: ${result.message ?? "OK"}`,
		);

		return { message: result.message, status: result.status };
	},
});

export const getComputerUseStatus = internalAction({
	args: { agentId: v.optional(v.id("agents")) },
	handler: async (ctx, { agentId }) => {
		const { sandbox } = await getRunning(ctx, agentId);
		const result = await withRetry(() => sandbox.computerUse.getStatus());
		return { status: result.status };
	},
});

// --- Screenshot ---

export const takeScreenshot = internalAction({
	args: {
		showCursor: v.optional(v.boolean()),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { showCursor, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);
		const result = await withRetry(() =>
			sandbox.computerUse.screenshot.takeFullScreen(showCursor ?? false),
		);

		const screenshot = result.screenshot ?? "";
		const sizeBytes = await recordAndLogScreenshot(
			ctx,
			sandboxRecord._id,
			agentId,
			screenshot,
			"Screenshot taken",
		);

		return {
			screenshot,
			cursorPosition: result.cursorPosition,
			sizeBytes,
		};
	},
});

export const takeScreenshotRegion = internalAction({
	args: {
		x: v.number(),
		y: v.number(),
		width: v.number(),
		height: v.number(),
		showCursor: v.optional(v.boolean()),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { x, y, width, height, showCursor, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);
		const result = await withRetry(() =>
			sandbox.computerUse.screenshot.takeRegion({ x, y, width, height }, showCursor ?? false),
		);

		const screenshot = result.screenshot ?? "";
		const sizeBytes = await recordAndLogScreenshot(
			ctx,
			sandboxRecord._id,
			agentId,
			screenshot,
			`Region screenshot (${x},${y} ${width}x${height})`,
		);

		return {
			screenshot,
			cursorPosition: result.cursorPosition,
			sizeBytes,
		};
	},
});

export const takeCompressedScreenshot = internalAction({
	args: {
		format: v.optional(v.string()),
		quality: v.optional(v.number()),
		scale: v.optional(v.number()),
		showCursor: v.optional(v.boolean()),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { format, quality, scale, showCursor, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);
		const result = await withRetry(() =>
			sandbox.computerUse.screenshot.takeCompressed({
				showCursor,
				format,
				quality,
				scale,
			}),
		);

		const screenshot = result.screenshot ?? "";
		const sizeBytes = await recordAndLogScreenshot(
			ctx,
			sandboxRecord._id,
			agentId,
			screenshot,
			`Compressed screenshot (${format ?? "default"}, q=${quality ?? "default"})`,
		);

		return {
			screenshot,
			cursorPosition: result.cursorPosition,
			sizeBytes,
		};
	},
});

// --- Mouse ---

export const mouseClick = internalAction({
	args: {
		x: v.number(),
		y: v.number(),
		button: v.optional(v.string()),
		double: v.optional(v.boolean()),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { x, y, button, double: dbl, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);
		const result = await sandbox.computerUse.mouse.click(x, y, button, dbl);

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"command",
			`Mouse click at (${x}, ${y}) button=${button ?? "left"} double=${dbl ?? false}`,
		);

		return { x: result.x, y: result.y };
	},
});

export const mouseMove = internalAction({
	args: {
		x: v.number(),
		y: v.number(),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { x, y, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);
		const result = await sandbox.computerUse.mouse.move(x, y);

		await recordAndLog(ctx, sandboxRecord._id, agentId, "command", `Mouse move to (${x}, ${y})`);

		return { x: result.x, y: result.y };
	},
});

export const mouseDrag = internalAction({
	args: {
		startX: v.number(),
		startY: v.number(),
		endX: v.number(),
		endY: v.number(),
		button: v.optional(v.string()),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { startX, startY, endX, endY, button, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);
		const result = await sandbox.computerUse.mouse.drag(startX, startY, endX, endY, button);

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"command",
			`Mouse drag from (${startX}, ${startY}) to (${endX}, ${endY})`,
		);

		return { x: result.x, y: result.y };
	},
});

export const mouseScroll = internalAction({
	args: {
		x: v.number(),
		y: v.number(),
		direction: v.union(v.literal("up"), v.literal("down")),
		amount: v.optional(v.number()),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { x, y, direction, amount, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);
		const result = await sandbox.computerUse.mouse.scroll(x, y, direction, amount);

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"command",
			`Mouse scroll ${direction} at (${x}, ${y}) amount=${amount ?? 3}`,
		);

		return { success: result };
	},
});

export const getMousePosition = internalAction({
	args: { agentId: v.optional(v.id("agents")) },
	handler: async (ctx, { agentId }) => {
		const { sandbox } = await getRunning(ctx, agentId);
		const result = await sandbox.computerUse.mouse.getPosition();
		return { x: result.x, y: result.y };
	},
});

// --- Keyboard ---

export const keyboardType = internalAction({
	args: {
		text: v.string(),
		delay: v.optional(v.number()),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { text, delay, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);
		await sandbox.computerUse.keyboard.type(text, delay);

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"command",
			`Keyboard type: "${text.length > 100 ? text.slice(0, 100) + "..." : text}"`,
		);

		return { success: true };
	},
});

export const keyboardPress = internalAction({
	args: {
		key: v.string(),
		modifiers: v.optional(v.array(v.string())),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { key, modifiers, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);
		await sandbox.computerUse.keyboard.press(key, modifiers);

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"command",
			`Keyboard press: ${modifiers?.length ? modifiers.join("+") + "+" : ""}${key}`,
		);

		return { success: true };
	},
});

export const keyboardHotkey = internalAction({
	args: {
		keys: v.string(),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { keys, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);
		await sandbox.computerUse.keyboard.hotkey(keys);

		await recordAndLog(ctx, sandboxRecord._id, agentId, "command", `Keyboard hotkey: ${keys}`);

		return { success: true };
	},
});

// --- Display ---

export const getDisplayInfo = internalAction({
	args: { agentId: v.optional(v.id("agents")) },
	handler: async (ctx, { agentId }) => {
		const { sandbox } = await getRunning(ctx, agentId);
		const result = await sandbox.computerUse.display.getInfo();
		return { displays: result.displays };
	},
});

export const getWindows = internalAction({
	args: { agentId: v.optional(v.id("agents")) },
	handler: async (ctx, { agentId }) => {
		const { sandbox } = await getRunning(ctx, agentId);
		const result = await sandbox.computerUse.display.getWindows();
		return { windows: result.windows };
	},
});

// --- Recording ---

export const startRecording = internalAction({
	args: {
		label: v.optional(v.string()),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { label, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);
		const result = await sandbox.computerUse.recording.start(label);

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"status",
			`Recording started: ${result.id} (${label ?? "no label"})`,
		);

		return {
			id: result.id,
			fileName: result.fileName,
			filePath: result.filePath,
			startTime: result.startTime,
			status: result.status,
		};
	},
});

export const stopRecording = internalAction({
	args: {
		id: v.string(),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { id, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);
		const result = await sandbox.computerUse.recording.stop(id);

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"status",
			`Recording stopped: ${id} (${result.durationSeconds ?? 0}s, ${result.sizeBytes ?? 0} bytes)`,
		);

		return {
			id: result.id,
			fileName: result.fileName,
			filePath: result.filePath,
			durationSeconds: result.durationSeconds,
			sizeBytes: result.sizeBytes,
			status: result.status,
		};
	},
});

export const listRecordings = internalAction({
	args: { agentId: v.optional(v.id("agents")) },
	handler: async (ctx, { agentId }) => {
		const { sandbox } = await getRunning(ctx, agentId);
		const result = await sandbox.computerUse.recording.list();
		return { recordings: result.recordings };
	},
});
