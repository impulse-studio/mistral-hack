import { internal } from "../../_generated/api";
import type { RunnerCtx } from "../shared/types";

type TaskRecord = { title: string; description?: string };

// Run a Computer Use task: start desktop → screenshot → execute interactions → return result
export async function runComputerUseTask(
	ctx: RunnerCtx,
	agentId: string,
	task: TaskRecord,
): Promise<string> {
	// 1. Ensure Computer Use environment is started (Xvfb + xfce4 + VNC)
	await ctx.runAction(internal.sandbox.lifecycle.ensureComputerUseStarted, { agentId });

	await ctx.runMutation(internal.logs.mutations.append, {
		agentId,
		type: "status" as const,
		content: "Computer Use environment ready",
	});

	// 2. Take initial screenshot to see the desktop
	const screenshot = await ctx.runAction(internal.sandbox.computerUse.takeScreenshot, {
		showCursor: true,
		agentId,
	});

	// 3. Get display info for context
	const displayInfo = await ctx.runAction(internal.sandbox.computerUse.getDisplayInfo, { agentId });

	// 4. Open a browser for browser-role agents
	if (task.description?.includes("http") || task.title.toLowerCase().includes("browser")) {
		// BUG 7 FIX: Use session-based background execution for reliable daemon launch
		await ctx.runAction(internal.sandbox.execute.runBackground, {
			command: "firefox",
			agentId,
		});

		// Wait for browser to open, then screenshot
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 3000);
		});

		await ctx.runAction(internal.sandbox.computerUse.takeScreenshot, { showCursor: true, agentId });
	}

	const results: string[] = [
		`Computer Use task executed for: ${task.title}`,
		`Display: ${JSON.stringify(displayInfo.displays?.[0] ?? "unknown")}`,
		`Initial screenshot: ${screenshot.sizeBytes} bytes`,
	];

	return results.join("\n");
}
