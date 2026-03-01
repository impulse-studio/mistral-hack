import { internal } from "../../_generated/api";
import { escapeShellArg } from "../../sandbox/shellUtils";
import type { RunnerCtx, RunnerResult } from "../shared/types";

// Researcher agent: shell commands + git for research, file analysis
export async function runResearcherTask(
	ctx: RunnerCtx,
	agentId: string,
	task: { title: string; description?: string },
): Promise<RunnerResult> {
	const prompt = `${task.title}${task.description ? `\n\n${task.description}` : ""}`;
	const cmdResult = await ctx.runAction(internal.sandbox.execute.runCommand, {
		command: `echo ${escapeShellArg(`Researching: ${prompt}`)}`,
		agentId,
	});
	return {
		success: true,
		result: cmdResult.result ?? "Researcher execution not yet fully implemented",
	};
}
