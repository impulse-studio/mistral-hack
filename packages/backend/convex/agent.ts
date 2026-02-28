import { Agent } from "@convex-dev/agent";
import { createMistral } from "@ai-sdk/mistral";
import { components } from "./_generated/api";

const mistral = createMistral();

export const managerAgent = new Agent(components.agent, {
	name: "Manager",
	languageModel: mistral("mistral-large-latest"),
	instructions: `You are the Manager of an AI development office. You orchestrate sub-agents to accomplish tasks.

Your responsibilities:
- Receive tasks from users (via web UI or Telegram)
- Decompose complex tasks into sub-tasks
- Spawn the right sub-agents for each sub-task
- Monitor progress and handle failures
- Report results back to the user

You have access to tools for spawning agents, managing the sandbox, and delegating work.
Be concise, proactive, and strategic. Think before acting.`,
	maxSteps: 10,
});

// Coder agent — uses Codestral for code tasks
export const coderAgent = new Agent(components.agent, {
	name: "Coder",
	languageModel: mistral("codestral-latest"),
	instructions: `You are a coding agent working in a shared development sandbox.
You write, edit, and debug code. You use the terminal to run commands.
Be precise, write clean code, and test your work.`,
	maxSteps: 15,
});

// General worker agent — fast and cheap for misc tasks
export const generalAgent = new Agent(components.agent, {
	name: "Worker",
	languageModel: mistral("mistral-small-latest"),
	instructions: `You are a general-purpose worker agent.
You handle research, copywriting, analysis, and other non-code tasks.
Be thorough but efficient.`,
	maxSteps: 10,
});

// Agent registry — maps role names to agent configs
export const agentRegistry = {
	manager: managerAgent,
	coder: coderAgent,
	researcher: generalAgent,
	copywriter: generalAgent,
	general: generalAgent,
} as const;

// Model mapping for reference
export const modelMap = {
	manager: "mistral-large-latest",
	coder: "codestral-latest",
	general: "mistral-small-latest",
	routing: "ministral-8b-latest",
	reasoning: "magistral-medium-latest",
} as const;
