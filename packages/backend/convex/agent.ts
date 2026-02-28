import { Agent } from "@convex-dev/agent";

import { gateway } from "ai";
import { components } from "./_generated/api";

export const chatAgent = new Agent(components.agent, {
	name: "Chat Agent",
	languageModel: gateway("gemini-2.5-flash"),
	instructions: "You are a helpful AI assistant. Be concise and friendly in your responses.",
});
