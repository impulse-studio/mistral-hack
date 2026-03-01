import { internal } from "../../_generated/api";
import { escapeShellArg } from "../../sandbox/helpers";
import type { RunnerCtx } from "../shared/types";

// After Vibe generates code, discover and execute the entry point
export async function verifyGeneratedCode(ctx: RunnerCtx, agentId: string): Promise<string> {
	const listing = await ctx.runAction(internal.sandbox.codeExecution.listFiles, {
		path: "/home/user",
		agentId,
	});

	const entryPoints = new Set(["index.ts", "main.ts", "index.js", "main.js", "app.ts", "app.js"]);
	const found = listing.files.find(
		(f: { name: string; isDir: boolean }) => !f.isDir && entryPoints.has(f.name),
	);

	if (!found) {
		const names = listing.files.map((f: { name: string }) => f.name).join(", ");
		await ctx.runMutation(internal.logs.mutations.append, {
			agentId,
			type: "status" as const,
			content: `No standard entry point found. Files: ${names}`,
		});
		return "";
	}

	await ctx.runMutation(internal.logs.mutations.append, {
		agentId,
		type: "status" as const,
		content: `Running entry point: ${found.name}`,
	});

	const ext = found.name.split(".").pop();
	const escapedName = escapeShellArg(found.name);
	const cmd =
		ext === "ts"
			? `cd /home/user && npx tsx ${escapedName}`
			: `cd /home/user && node ${escapedName}`;

	const execResult = await ctx.runAction(internal.sandbox.execute.runCommand, {
		command: cmd,
		agentId,
	});

	let output = `\n\n--- Execution (${found.name}) ---\n${execResult.result ?? "(no output)"}`;
	if (execResult.exitCode !== 0) {
		output += `\n[exit code: ${execResult.exitCode}]`;
	}
	return output;
}

// Run coder agent: Vibe headless → verify generated code
export async function runCoderTask(
	ctx: RunnerCtx,
	agentId: string,
	task: { title: string; description?: string },
): Promise<string> {
	// Step 1: Use Vibe headless to generate the code
	const vibeResult = await ctx.runAction(internal.sandbox.vibe.runVibeHeadless, {
		agentId,
		prompt: `${task.title}\n\n${task.description ?? ""}`,
	});
	let result = vibeResult.output ?? "";

	// Step 2: Discover and execute the generated code
	await ctx.runMutation(internal.logs.mutations.append, {
		agentId,
		type: "status" as const,
		content: "Vibe complete — verifying generated code...",
	});

	try {
		result += await verifyGeneratedCode(ctx, agentId);
	} catch (execError) {
		const msg = execError instanceof Error ? execError.message : String(execError);
		await ctx.runMutation(internal.logs.mutations.append, {
			agentId,
			type: "stderr" as const,
			content: `Post-Vibe execution failed: ${msg}`,
		});
	}

	return result;
}
