import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { escapeShellArg } from "../../sandbox/shellUtils";
import type { RunnerCtx, RunnerResult } from "../shared/types";

const WORK_DIR = "/home/user";

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
		stream: false,
	});

	let output = `\n\n--- Execution (${found.name}) ---\n${execResult.result ?? "(no output)"}`;
	if (execResult.exitCode !== 0) {
		output += `\n[exit code: ${execResult.exitCode}]`;
	}
	return output;
}

// Sanitize a task title into a valid git branch name segment
function toBranchSlug(title: string): string {
	return (
		title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 50) || "generated-code"
	);
}

// Auto-commit generated code (best-effort — failure here doesn't fail the task)
async function autoCommit(
	ctx: RunnerCtx,
	agentId: string,
	task: { title: string },
	agentName: string,
): Promise<string> {
	const typedAgentId = agentId as Id<"agents">;

	// Check if /home/user is already a git repo
	const gitCheck = await ctx.runAction(internal.sandbox.execute.runCommand, {
		command: `git -C ${WORK_DIR} rev-parse --git-dir 2>/dev/null`,
		agentId,
		stream: false,
	});

	const isRepo = gitCheck.exitCode === 0;
	const branchName = `feat/${toBranchSlug(task.title)}`;
	const commitMsg = `feat: ${task.title}`;

	if (isRepo) {
		// Cloned repo — create feature branch, add, commit via SDK
		await ctx.runAction(internal.sandbox.git.gitCreateBranch, {
			path: WORK_DIR,
			name: branchName,
			agentId: typedAgentId,
		});
		await ctx.runAction(internal.sandbox.git.gitCheckoutBranch, {
			path: WORK_DIR,
			branch: branchName,
			agentId: typedAgentId,
		});
		await ctx.runAction(internal.sandbox.git.gitAdd, {
			path: WORK_DIR,
			files: ["."],
			agentId: typedAgentId,
		});
		await ctx.runAction(internal.sandbox.git.gitCommit, {
			path: WORK_DIR,
			message: commitMsg,
			author: agentName,
			email: "coder@ai-office.dev",
			agentId: typedAgentId,
		});
		return `[committed] on branch ${branchName}`;
	}

	// No repo — init + add + commit via shell (no remote for SDK ops)
	await ctx.runAction(internal.sandbox.execute.runCommand, {
		command: `cd ${WORK_DIR} && git init && git add . && git commit -m ${escapeShellArg(commitMsg)} --author=${escapeShellArg(`${agentName} <coder@ai-office.dev>`)}`,
		agentId,
		stream: false,
	});
	return "[committed] in new local repo";
}

// Run coder agent: Vibe headless → verify generated code → auto-commit
export async function runCoderTask(
	ctx: RunnerCtx,
	agentId: string,
	task: { title: string; description?: string },
	agentName: string,
): Promise<RunnerResult> {
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
		return { success: false, result: `${result}\n\nExecution failed: ${msg}` };
	}

	// Step 3: Auto-commit generated code (best-effort)
	try {
		await ctx.runMutation(internal.logs.mutations.append, {
			agentId,
			type: "status" as const,
			content: "Auto-committing generated code...",
		});
		const commitInfo = await autoCommit(ctx, agentId, task, agentName);
		result += `\n\n${commitInfo}`;
	} catch (commitError) {
		const msg = commitError instanceof Error ? commitError.message : String(commitError);
		await ctx.runMutation(internal.logs.mutations.append, {
			agentId,
			type: "stderr" as const,
			content: `Auto-commit failed (non-fatal): ${msg}`,
		});
	}

	return { success: true, result };
}
