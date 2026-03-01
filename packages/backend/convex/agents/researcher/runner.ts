import { internal } from "../../_generated/api";
import { escapeShellArg } from "../../sandbox/shellUtils";
import type { RunnerCtx } from "../shared/types";

// Researcher agent: shell commands + git for research, file analysis
export async function runResearcherTask(
	ctx: RunnerCtx,
	agentId: string,
	task: { title: string; description?: string },
): Promise<string> {
	const prompt = `${task.title}${task.description ? `\n\n${task.description}` : ""}`;
	const cmdResult = await ctx.runAction(internal.sandbox.execute.runCommand, {
		command: `echo ${escapeShellArg(`Researching: ${prompt}`)}`,
		agentId,
	});
	return cmdResult.result ?? "Researcher execution not yet fully implemented";
}
