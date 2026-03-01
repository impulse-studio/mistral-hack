import { createMistral } from "@ai-sdk/mistral";
import { generateText } from "ai";
import { internal } from "../../_generated/api";
import { escapeShellArg } from "../../sandbox/shellUtils";
import type { RunnerCtx } from "../shared/types";

export async function runCopywriterTask(
	ctx: RunnerCtx,
	agentId: string,
	task: { title: string; description?: string },
): Promise<string> {
	const mistralClient = createMistral();

	// 1. Context gathering — read any referenced files
	let contextText = "";
	if (task.description) {
		const fileRefs = task.description.match(/\/home\/company\/[^\s]+/g) ?? [];
		for (const filePath of fileRefs.slice(0, 5)) {
			try {
				const result = await ctx.runAction(internal.sandbox.execute.runCommand, {
					command: `cat ${escapeShellArg(filePath)} 2>/dev/null | head -200`,
					agentId,
				});
				if (result.result) {
					contextText += `\n--- ${filePath} ---\n${result.result.slice(0, 2000)}\n`;
				}
			} catch {
				// file not found, skip
			}
		}
	}

	await ctx.runMutation(internal.logs.mutations.append, {
		agentId,
		type: "status" as const,
		content: contextText
			? `Gathered context from ${contextText.split("---").length - 1} files`
			: "No context files found, generating from task description",
	});

	// 2. Content generation — first draft
	await ctx.runMutation(internal.logs.mutations.append, {
		agentId,
		type: "status" as const,
		content: "Generating first draft...",
	});

	const { text: draft } = await generateText({
		model: mistralClient("magistral-medium-latest"),
		messages: [
			{
				role: "system",
				content:
					"You are a professional copywriter. Write the requested content based on the task and context provided. Output ONLY the content, no meta-commentary.",
			},
			{
				role: "user",
				content: `Task: ${task.title}\n\nDescription: ${task.description ?? "No additional details."}\n\nContext:\n${contextText || "(none)"}`,
			},
		],
	});

	// 3. Self-review — editorial pass
	await ctx.runMutation(internal.logs.mutations.append, {
		agentId,
		type: "status" as const,
		content: "Running editorial review...",
	});

	const { text: refined } = await generateText({
		model: mistralClient("magistral-medium-latest"),
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
	const filename = task.title
		.replace(/[^a-zA-Z0-9\s]/g, "")
		.trim()
		.replace(/\s+/g, "-")
		.toLowerCase()
		.slice(0, 50);
	const outputPath = `/home/company/outputs/${filename || "content"}.md`;

	await ctx.runAction(internal.sandbox.execute.runCommand, {
		command: `mkdir -p /home/company/outputs && cat > ${escapeShellArg(outputPath)} << 'CONTENT_EOF'\n${refined}\nCONTENT_EOF`,
		agentId,
	});

	await ctx.runMutation(internal.logs.mutations.append, {
		agentId,
		type: "status" as const,
		content: `Content saved to ${outputPath}`,
	});

	return `Saved to ${outputPath}\n\n${refined}`;
}
