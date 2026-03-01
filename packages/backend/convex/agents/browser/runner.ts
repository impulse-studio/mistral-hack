import { generateObject } from "ai";
import { createMistral } from "@ai-sdk/mistral";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { RunnerCtx } from "../shared/types";
import { MANAGER_MODEL } from "../models";

type TaskRecord = { title: string; description?: string };

const MAX_ITERATIONS = 15;
const ACTION_DELAY_MS = 1000;

// Structured action schema — the model picks one action per step
const ActionSchema = z.discriminatedUnion("action", [
	z.object({
		action: z.literal("click"),
		x: z.number().describe("X coordinate to click"),
		y: z.number().describe("Y coordinate to click"),
		button: z.enum(["left", "right"]).default("left").describe("Mouse button"),
		reasoning: z.string().describe("Why you are clicking here"),
	}),
	z.object({
		action: z.literal("double_click"),
		x: z.number().describe("X coordinate to double-click"),
		y: z.number().describe("Y coordinate to double-click"),
		reasoning: z.string().describe("Why you are double-clicking here"),
	}),
	z.object({
		action: z.literal("type"),
		text: z.string().describe("Text to type"),
		reasoning: z.string().describe("Why you are typing this"),
	}),
	z.object({
		action: z.literal("key"),
		key: z.string().describe("Key to press (e.g. Enter, Tab, Escape)"),
		modifiers: z.array(z.string()).optional().describe("Modifier keys (e.g. ctrl, alt, shift)"),
		reasoning: z.string().describe("Why you are pressing this key"),
	}),
	z.object({
		action: z.literal("hotkey"),
		keys: z.string().describe("Key combo (e.g. ctrl+c, ctrl+l, alt+tab)"),
		reasoning: z.string().describe("Why you are pressing this hotkey"),
	}),
	z.object({
		action: z.literal("scroll"),
		x: z.number().describe("X coordinate for scroll position"),
		y: z.number().describe("Y coordinate for scroll position"),
		direction: z.enum(["up", "down"]).describe("Scroll direction"),
		amount: z.number().optional().describe("Scroll amount (default 3)"),
		reasoning: z.string().describe("Why you are scrolling"),
	}),
	z.object({
		action: z.literal("wait"),
		seconds: z.number().min(1).max(5).describe("Seconds to wait for page to load"),
		reasoning: z.string().describe("Why you are waiting"),
	}),
	z.object({
		action: z.literal("done"),
		result: z.string().describe("Summary of what was accomplished"),
	}),
]);

type Action = z.infer<typeof ActionSchema>;

// Run a Computer Use task: start desktop → vision loop → return result
export async function runComputerUseTask(
	ctx: RunnerCtx,
	agentId: string,
	task: TaskRecord,
): Promise<string> {
	const mistral = createMistral();
	const model = mistral(MANAGER_MODEL);

	// 1. Ensure Computer Use environment is started (Xvfb + xfce4 + VNC)
	await ctx.runAction(internal.sandbox.lifecycle.ensureComputerUseStarted, { agentId });
	await log(ctx, agentId, "status", "Computer Use environment ready");

	// 2. Get display info for context
	const displayInfo = await ctx.runAction(internal.sandbox.computerUse.getDisplayInfo, { agentId });
	const display = displayInfo.displays?.[0];
	const resolution = display ? `${display.width}x${display.height}` : "unknown";

	// 3. Extract URL from task and launch Firefox if needed
	const urlMatch = (task.description ?? task.title).match(/https?:\/\/[^\s"')]+/);
	if (urlMatch) {
		await ctx.runAction(internal.sandbox.execute.runBackground, {
			command: `firefox "${urlMatch[0]}"`,
			agentId,
		});
		await log(ctx, agentId, "command", `Launched Firefox: ${urlMatch[0]}`);
		await delay(3000); // wait for browser to open
	} else {
		// Launch Firefox to homepage for general browsing tasks
		await ctx.runAction(internal.sandbox.execute.runBackground, {
			command: "firefox",
			agentId,
		});
		await log(ctx, agentId, "command", "Launched Firefox");
		await delay(3000);
	}

	// 4. Vision-action loop
	const actionLog: string[] = [];
	let finalResult = "";

	for (let i = 0; i < MAX_ITERATIONS; i++) {
		// Take compressed screenshot (JPEG, quality 60 to save tokens)
		const screenshotData = await ctx.runAction(
			internal.sandbox.computerUse.takeCompressedScreenshot,
			{ format: "jpeg", quality: 60, showCursor: true, agentId },
		);

		await log(
			ctx,
			agentId,
			"status",
			`Step ${i + 1}/${MAX_ITERATIONS}: Analyzing screenshot (${screenshotData.sizeBytes} bytes)`,
		);

		// Ask Mistral Large to decide next action
		const { object: nextAction } = await generateObject({
			model,
			schema: ActionSchema,
			messages: [
				{
					role: "system",
					content: `You are a browser agent controlling a desktop via Computer Use.
Screen resolution: ${resolution}. You see a screenshot and decide the next action.

Task: ${task.title}
${task.description ? `Details: ${task.description}` : ""}

Previous actions this session:
${actionLog.length > 0 ? actionLog.map((a, idx) => `${idx + 1}. ${a}`).join("\n") : "None yet — this is the first step."}

Rules:
- Describe what you see in your reasoning before deciding an action
- Click coordinates must be within the screen bounds (${resolution})
- Use "done" when the task is complete or you have gathered the needed information
- Use "wait" if a page is loading
- Be precise with click coordinates — aim for the center of UI elements`,
				},
				{
					role: "user",
					content: [
						{
							type: "text",
							text: "Here is the current screenshot. What action should be taken next?",
						},
						{
							type: "image",
							image: screenshotData.screenshot,
							mediaType: "image/jpeg",
						},
					],
				},
			],
		});

		// Log the action
		const actionDesc = formatAction(nextAction);
		actionLog.push(actionDesc);
		await log(ctx, agentId, "command", `Action ${i + 1}: ${actionDesc}`);

		// Execute the action
		if (nextAction.action === "done") {
			finalResult = nextAction.result;
			await log(ctx, agentId, "status", `Task complete: ${nextAction.result}`);
			break;
		}

		await executeAction(ctx, agentId, nextAction);
		await delay(ACTION_DELAY_MS);
	}

	if (!finalResult) {
		finalResult = `Reached max iterations (${MAX_ITERATIONS}). Actions taken:\n${actionLog.join("\n")}`;
		await log(ctx, agentId, "status", `Max iterations reached (${MAX_ITERATIONS})`);
	}

	return finalResult;
}

// Execute a single action on the sandbox
async function executeAction(ctx: RunnerCtx, agentId: string, action: Action): Promise<void> {
	switch (action.action) {
		case "click": {
			await ctx.runAction(internal.sandbox.computerUse.mouseClick, {
				x: action.x,
				y: action.y,
				button: action.button,
				agentId,
			});
			break;
		}

		case "double_click": {
			await ctx.runAction(internal.sandbox.computerUse.mouseClick, {
				x: action.x,
				y: action.y,
				double: true,
				agentId,
			});
			break;
		}

		case "type": {
			await ctx.runAction(internal.sandbox.computerUse.keyboardType, {
				text: action.text,
				agentId,
			});
			break;
		}

		case "key": {
			await ctx.runAction(internal.sandbox.computerUse.keyboardPress, {
				key: action.key,
				modifiers: action.modifiers,
				agentId,
			});
			break;
		}

		case "hotkey": {
			await ctx.runAction(internal.sandbox.computerUse.keyboardHotkey, {
				keys: action.keys,
				agentId,
			});
			break;
		}

		case "scroll": {
			await ctx.runAction(internal.sandbox.computerUse.mouseScroll, {
				x: action.x,
				y: action.y,
				direction: action.direction,
				amount: action.amount,
				agentId,
			});
			break;
		}

		case "wait": {
			await delay(action.seconds * 1000);
			break;
		}

		case "done": {
			// Handled in the loop above
			break;
		}
	}
}

function formatAction(action: Action): string {
	switch (action.action) {
		case "click": {
			return `click(${action.x}, ${action.y}, ${action.button}) — ${action.reasoning}`;
		}
		case "double_click": {
			return `double_click(${action.x}, ${action.y}) — ${action.reasoning}`;
		}
		case "type": {
			return `type("${action.text.length > 50 ? action.text.slice(0, 50) + "..." : action.text}") — ${action.reasoning}`;
		}
		case "key": {
			return `key(${action.modifiers?.length ? action.modifiers.join("+") + "+" : ""}${action.key}) — ${action.reasoning}`;
		}
		case "hotkey": {
			return `hotkey(${action.keys}) — ${action.reasoning}`;
		}
		case "scroll": {
			return `scroll(${action.direction}, ${action.amount ?? 3}) at (${action.x}, ${action.y}) — ${action.reasoning}`;
		}
		case "wait": {
			return `wait(${action.seconds}s) — ${action.reasoning}`;
		}
		case "done": {
			return `done — ${action.result}`;
		}
	}
}

async function log(ctx: RunnerCtx, agentId: string, type: string, content: string): Promise<void> {
	await ctx.runMutation(internal.logs.mutations.append, {
		agentId,
		type: type as "status" | "command" | "stdout" | "stderr",
		content,
	});
}

function delay(ms: number): Promise<void> {
	return new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});
}
