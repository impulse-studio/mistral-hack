import { generateObject } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { RunnerCtx, RunnerResult } from "../shared/types";
import { mistral, MANAGER_MODEL } from "../models";

type TaskRecord = { title: string; description?: string };

const MAX_ITERATIONS = 200;
const ACTION_DELAY_MS = 1000;

// Flat action schema — all fields on one object; "action" acts as discriminator.
const ActionSchema = z.object({
	action: z
		.enum(["click", "double_click", "type", "key", "hotkey", "scroll", "wait", "done"])
		.describe("The action to perform"),
	reasoning: z.string().optional().describe("Why you are taking this action"),
	x: z.number().optional().describe("X coordinate (click, double_click, scroll)"),
	y: z.number().optional().describe("Y coordinate (click, double_click, scroll)"),
	button: z.enum(["left", "right"]).optional().describe("Mouse button for click (default: left)"),
	text: z.string().optional().describe("Text to type (for type action)"),
	key: z.string().optional().describe("Key to press, e.g. Enter, Tab, Escape (for key action)"),
	modifiers: z
		.array(z.string())
		.optional()
		.describe("Modifier keys e.g. ctrl, alt, shift (for key action)"),
	keys: z.string().optional().describe("Key combo e.g. ctrl+c, alt+tab (for hotkey action)"),
	direction: z.enum(["up", "down"]).optional().describe("Scroll direction (for scroll action)"),
	amount: z.number().optional().describe("Scroll amount, default 3 (for scroll action)"),
	seconds: z.number().optional().describe("Seconds to wait 1-5 (for wait action)"),
	result: z.string().optional().describe("Summary of what was accomplished (for done action)"),
});

type FlatAction = z.infer<typeof ActionSchema>;

// Typed action variants for executeAction/formatAction (narrow from flat schema)
type Action =
	| { action: "click"; x: number; y: number; button: string; reasoning?: string }
	| { action: "double_click"; x: number; y: number; reasoning?: string }
	| { action: "type"; text: string; reasoning?: string }
	| { action: "key"; key: string; modifiers?: string[]; reasoning?: string }
	| { action: "hotkey"; keys: string; reasoning?: string }
	| {
			action: "scroll";
			x: number;
			y: number;
			direction: "up" | "down";
			amount?: number;
			reasoning?: string;
	  }
	| { action: "wait"; seconds: number; reasoning?: string }
	| { action: "done"; result: string; reasoning?: string };

function toAction(raw: FlatAction): Action {
	switch (raw.action) {
		case "click": {
			return {
				action: "click",
				x: raw.x ?? 0,
				y: raw.y ?? 0,
				button: raw.button ?? "left",
				reasoning: raw.reasoning,
			};
		}
		case "double_click": {
			return { action: "double_click", x: raw.x ?? 0, y: raw.y ?? 0, reasoning: raw.reasoning };
		}
		case "type": {
			return { action: "type", text: raw.text ?? "", reasoning: raw.reasoning };
		}
		case "key": {
			return {
				action: "key",
				key: raw.key ?? "Enter",
				modifiers: raw.modifiers,
				reasoning: raw.reasoning,
			};
		}
		case "hotkey": {
			return { action: "hotkey", keys: raw.keys ?? "", reasoning: raw.reasoning };
		}
		case "scroll": {
			return {
				action: "scroll",
				x: raw.x ?? 0,
				y: raw.y ?? 0,
				direction: raw.direction ?? "down",
				amount: raw.amount,
				reasoning: raw.reasoning,
			};
		}
		case "wait": {
			return {
				action: "wait",
				seconds: Math.min(5, Math.max(1, raw.seconds ?? 2)),
				reasoning: raw.reasoning,
			};
		}
		case "done": {
			return { action: "done", result: raw.result ?? "Task completed.", reasoning: raw.reasoning };
		}
	}
}

// Run a Computer Use task: start desktop → vision loop → return result
export async function runComputerUseTask(
	ctx: RunnerCtx,
	agentId: string,
	task: TaskRecord,
): Promise<RunnerResult> {
	const model = mistral(MANAGER_MODEL);

	// 1. Ensure Computer Use environment is started (Xvfb + xfce4 + VNC)
	await ctx.runAction(internal.sandbox.lifecycle.ensureComputerUseStarted, { agentId });
	await log(ctx, agentId, "status", "Computer Use environment ready");

	// 2. Get display info for context
	const displayInfo = await ctx.runAction(internal.sandbox.computerUse.getDisplayInfo, { agentId });
	const display = displayInfo.displays?.[0];
	const resolution = display ? `${display.width}x${display.height}` : "unknown";

	// 3. Ensure a browser is installed, then launch it
	const browserPath = await ensureBrowser(ctx, agentId);
	let browserLaunched = false;

	// Detect the X display from the Xvfb process
	const xDisplay = await detectDisplay(ctx, agentId);

	// Container-safe flags for headless environments
	const containerFlags = browserPath.includes("chrom")
		? "--no-sandbox --disable-gpu --disable-dev-shm-usage --no-first-run --no-default-browser-check --disable-quic --start-maximized"
		: "";

	const urlMatch = (task.description ?? task.title).match(/https?:\/\/[^\s"')]+/);
	const target = urlMatch ? `"${urlMatch[0]}"` : "";
	const launchCmd = `DISPLAY=${xDisplay} ${browserPath} ${containerFlags} ${target}`.trim();

	await ctx.runAction(internal.sandbox.execute.runBackground, {
		command: launchCmd,
		agentId,
	});
	await log(ctx, agentId, "command", `Launched browser: ${launchCmd}`);

	// Wait for the browser process + window to appear (poll up to 15s)
	for (let attempt = 0; attempt < 5; attempt++) {
		await delay(3000);

		// First check if the browser process is still alive
		const procCheck = await ctx.runAction(internal.sandbox.execute.runCommand, {
			command: `pgrep -f "${browserPath.split("/").pop()}" > /dev/null && echo ALIVE || echo DEAD`,
			agentId,
			stream: false,
		});
		const procStatus = (procCheck.result as string).trim();

		if (procStatus === "DEAD") {
			await log(ctx, agentId, "stderr", `Browser process not found (attempt ${attempt + 1})`);
			if (attempt < 3) {
				// Retry with different approach
				await ctx.runAction(internal.sandbox.execute.runBackground, {
					command: launchCmd,
					agentId,
				});
				await log(ctx, agentId, "status", `Retrying browser launch (attempt ${attempt + 2})`);
				continue;
			}
			break;
		}

		// Process is alive — check for window by title
		try {
			const windowInfo = await ctx.runAction(internal.sandbox.computerUse.getWindows, {
				agentId,
			});
			const windows = windowInfo.windows as Array<{ title?: string; name?: string }> | undefined;
			const browserWindows = windows?.filter((w) => {
				const t = (w.title ?? w.name ?? "").toLowerCase();
				return (
					t.includes("chromium") ||
					t.includes("chrome") ||
					t.includes("firefox") ||
					/\.\w{2,}/.test(t)
				);
			});
			if (browserWindows && browserWindows.length > 0) {
				const names = browserWindows.map((w) => w.title ?? w.name).join(", ");
				await log(ctx, agentId, "status", `Browser window detected: ${names}`);
				browserLaunched = true;
				break;
			}
		} catch {
			// getWindows may fail if CU is still starting
		}
		await log(ctx, agentId, "status", `Waiting for browser window... (attempt ${attempt + 1})`);
	}

	if (!browserLaunched) {
		await log(
			ctx,
			agentId,
			"stderr",
			"No browser window detected after retries — proceeding with vision loop",
		);
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
		const { object, usage: stepUsage } = await generateObject({
			model,
			schema: ActionSchema,
			messages: [
				{
					role: "system",
					content: `You are a browser agent controlling a desktop via Computer Use.
Screen resolution: ${resolution}. You see a screenshot and decide the next action.

Task: ${task.title}
${task.description ? `Details: ${task.description}` : ""}

Context: A browser has already been launched via command line${urlMatch ? ` with URL ${urlMatch[0]}` : ""}. ${browserLaunched ? "The browser window should be visible on screen." : "The browser may still be loading — look for it or wait."}
If you see the desktop without a browser window, try clicking on the taskbar at the bottom or use Alt+Tab to find it.

Previous actions this session:
${actionLog.length > 0 ? actionLog.map((a, idx) => `${idx + 1}. ${a}`).join("\n") : "None yet — this is the first step."}

Rules:
- Describe what you see in your reasoning before deciding an action
- Click coordinates must be within the screen bounds (${resolution})
- Use "done" when the task is complete or you have gathered the needed information
- Use "done" to report failure if the same error persists after 2-3 attempts (e.g. connection errors, page not loading)
- Use "wait" if a page is loading
- Be precise with click coordinates — aim for the center of UI elements
- Do NOT open the Applications menu to find the browser — it was already launched
- IMPORTANT: Do not repeat the same failing action more than 2 times. If something isn't working, try a different approach or report "done" with what you observed`,
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

		const nextAction = toAction(object);

		// Log the action + usage
		const actionDesc = formatAction(nextAction);
		actionLog.push(actionDesc);

		const browserEntries: Array<{ type: "reasoning" | "usage" | "command"; content: string }> = [
			{ type: "command", content: `Action ${i + 1}: ${actionDesc}` },
		];

		if (stepUsage) {
			browserEntries.push({
				type: "usage",
				content: JSON.stringify({
					step: i + 1,
					inputTokens: stepUsage.inputTokens ?? 0,
					outputTokens: stepUsage.outputTokens ?? 0,
					reasoningTokens: stepUsage.outputTokenDetails?.reasoningTokens ?? 0,
					totalTokens: stepUsage.totalTokens ?? 0,
				}),
			});
		}

		await ctx.runMutation(internal.logs.mutations.appendBatch, {
			agentId,
			entries: browserEntries,
		});

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
		await log(
			ctx,
			agentId,
			"stderr",
			`Max iterations reached (${MAX_ITERATIONS}) — task incomplete`,
		);
		return { success: false, result: finalResult };
	}

	return { success: true, result: finalResult };
}

// Detect the X display from running Xvfb process (default :0)
async function detectDisplay(ctx: RunnerCtx, agentId: string): Promise<string> {
	try {
		const result = await ctx.runAction(internal.sandbox.execute.runCommand, {
			command:
				"ps aux | grep 'Xvfb :[0-9]' | grep -v grep | head -1 | sed 's/.*Xvfb \\(:[0-9]*\\).*/\\1/'",
			agentId,
			stream: false,
		});
		const display = (result.result as string).trim();
		if (display && display.startsWith(":")) return display;
	} catch {
		// fall through to default
	}
	return ":0";
}

// Ensure a browser is available in the sandbox, installing one if needed.
// Returns the command to launch the browser.
async function ensureBrowser(ctx: RunnerCtx, agentId: string): Promise<string> {
	// Check which browsers are available
	const checkResult = await ctx.runAction(internal.sandbox.execute.runCommand, {
		command:
			"which firefox || which chromium-browser || which chromium || which google-chrome || echo NONE",
		agentId,
		stream: false,
	});

	const browserPath = (checkResult.result as string).trim();

	if (browserPath && browserPath !== "NONE") {
		await log(ctx, agentId, "status", `Browser found: ${browserPath}`);
		return browserPath;
	}

	// No browser found — install one
	await log(ctx, agentId, "status", "No browser found, installing chromium...");

	// Try common package managers
	const installResult = await ctx.runAction(internal.sandbox.execute.runCommand, {
		command:
			"(apt-get update -qq && apt-get install -y -qq chromium-browser 2>/dev/null) || " +
			"(apt-get update -qq && apt-get install -y -qq chromium 2>/dev/null) || " +
			"(dnf install -y chromium 2>/dev/null) || " +
			"(apk add --no-cache chromium 2>/dev/null) || " +
			"echo INSTALL_FAILED",
		agentId,
		stream: false,
	});

	const installOutput = (installResult.result as string).trim();
	if (installOutput.endsWith("INSTALL_FAILED")) {
		await log(ctx, agentId, "stderr", "Failed to install browser — will attempt with xdg-open");
		return "xdg-open";
	}

	// Find the installed browser
	const recheck = await ctx.runAction(internal.sandbox.execute.runCommand, {
		command: "which chromium-browser || which chromium || which google-chrome",
		agentId,
		stream: false,
	});

	const installed = (recheck.result as string).trim();
	if (installed) {
		await log(ctx, agentId, "status", `Browser installed: ${installed}`);
		return `${installed} --no-sandbox`;
	}

	return "xdg-open";
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
		type: type as "status" | "command" | "stdout" | "stderr" | "reasoning" | "usage",
		content,
	});
}

function delay(ms: number): Promise<void> {
	return new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});
}
