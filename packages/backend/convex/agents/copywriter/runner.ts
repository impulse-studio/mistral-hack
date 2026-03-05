import { generateText } from "ai";
import { internal } from "../../_generated/api";
import { escapeShellArg } from "../../sandbox/shellUtils";
import { mistral, MANAGER_MODEL } from "../models";
import type { RunnerCtx, RunnerResult } from "../shared/types";

// Sanitize a title into a safe filename: lowercase, hyphens, .md
function toFilename(title: string): string {
	return (
		(title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 80) || "output") + ".md"
	);
}

// Gather context from the sandbox by reading files mentioned in the task
async function gatherContext(
	ctx: RunnerCtx,
	agentId: string,
	description: string,
): Promise<string> {
	// Extract file paths from description (anything starting with / or ./)
	const pathMatches = description.match(/(?:\/[\w./-]+|\.\/[\w./-]+)/g);
	if (!pathMatches || pathMatches.length === 0) return "";

	const chunks: string[] = [];
	for (const filePath of pathMatches.slice(0, 5)) {
		try {
			const result = await ctx.runAction(internal.sandbox.execute.runCommand, {
				command: `cat ${escapeShellArg(filePath)} 2>/dev/null | head -c 10000`,
				agentId,
				stream: false,
			});
			if (result.result && result.result.trim()) {
				chunks.push(`--- ${filePath} ---\n${result.result}`);
			}
		} catch {
			// File not found or unreadable — skip
		}
	}
	return chunks.join("\n\n");
}

// Run copywriter agent: context → draft → self-review → save
export async function runCopywriterTask(
	ctx: RunnerCtx,
	agentId: string,
	task: { title: string; description?: string },
): Promise<RunnerResult> {
	const description = task.description ?? "";

	// 1. Context gathering
	await ctx.runMutation(internal.logs.mutations.append, {
		agentId,
		type: "status" as const,
		content: "Gathering context...",
	});
	const contextText = await gatherContext(ctx, agentId, description);

	// 2. Generate first draft
	await ctx.runMutation(internal.logs.mutations.append, {
		agentId,
		type: "status" as const,
		content: "Writing first draft...",
	});
	const { text: draft } = await generateText({
		model: mistral(MANAGER_MODEL),
		messages: [
			{
				role: "system",
				content:
					"You are a professional copywriter. Write the requested content based on the task and context provided. Output ONLY the content, no meta-commentary.",
			},
			{
				role: "user",
				content: `Task: ${task.title}\n\nDescription: ${description}\n\nContext:\n${contextText}`,
			},
		],
	});

	// 3. Self-review and refine
	await ctx.runMutation(internal.logs.mutations.append, {
		agentId,
		type: "status" as const,
		content: "Reviewing and refining...",
	});
	const { text: refined } = await generateText({
		model: mistral(MANAGER_MODEL),
		messages: [
			{
				role: "system",
				content:
					"You are an editor. Review this draft and improve it: fix grammar, improve flow, tighten prose, ensure it meets the task requirements. Output ONLY the improved version.",
			},
			{
				role: "user",
				content: `Task: ${task.title}\n\nDraft:\n${draft}`,
			},
		],
	});

	// 4. Save output to sandbox
	const filename = toFilename(task.title);
	const outputPath = `/home/company/outputs/${filename}`;

	await ctx.runAction(internal.sandbox.execute.runCommand, {
		command: `mkdir -p /home/company/outputs && cat > ${escapeShellArg(outputPath)} << 'COPYWRITER_EOF'\n${refined}\nCOPYWRITER_EOF`,
		agentId,
		stream: false,
	});

	await ctx.runMutation(internal.logs.mutations.append, {
		agentId,
		type: "status" as const,
		content: `Saved output to ${outputPath}`,
	});

	return { success: true, result: `Content saved to ${outputPath}:\n\n${refined}` };
}
