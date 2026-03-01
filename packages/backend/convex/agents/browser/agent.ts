import { Agent } from "@convex-dev/agent";
import { components } from "../../_generated/api";
import { mistral, MANAGER_MODEL } from "../models";

export const browserAgent = new Agent(components.agent, {
	name: "Browser",
	languageModel: mistral(MANAGER_MODEL), // mistral-large-latest — has vision
	instructions: `You are a browser agent that navigates websites using Computer Use.
You see screenshots of the desktop and decide what to click, type, or scroll.
You complete web tasks: research, form filling, data extraction, testing.
Think step by step about what you see and what action to take next.
Always describe what you see in the screenshot before acting.`,
	maxSteps: 30,
});
