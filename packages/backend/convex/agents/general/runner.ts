import { internal } from "../../_generated/api";
import { escapeShellArg } from "../../sandbox/shellUtils";
import type { RunnerCtx } from "../shared/types";

// Shell commands for researcher/copywriter/general — placeholder implementation
export async function runGeneralTask(
	ctx: RunnerCtx,
	agentId: string,
	task: { title: string },
	role: string,
): Promise<string> {
	const cmdResult = await ctx.runAction(internal.sandbox.execute.runCommand, {
		command: `echo ${escapeShellArg(`Task: ${task.title}`)} && echo ${escapeShellArg(`Agent role: ${role}`)}`,
		agentId,
	});
	return cmdResult.result ?? "Non-code agent execution not yet fully implemented";
}
