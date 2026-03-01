import { Agent } from "@convex-dev/agent";
import { components } from "../../_generated/api";
import { mistral, CODER_MODEL } from "../models";

export const coderAgent = new Agent(components.agent, {
	name: "Coder",
	languageModel: mistral(CODER_MODEL),
	instructions: `You are a coding agent working in a dedicated development sandbox.
You write, edit, and debug code. You use the terminal to run commands.
Be precise, write clean code, and test your work.`,
	maxSteps: 15,
});
