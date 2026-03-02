import { createGateway } from "ai";

const gateway = createGateway({
	apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
});

export const mistral = gateway;

export const MANAGER_MODEL = "anthropic/claude-sonnet-4.6";
export const CODER_MODEL = "anthropic/claude-sonnet-4.6";
export const ROUTING_MODEL = "anthropic/claude-haiku-4.5";
export const REASONING_MODEL = "anthropic/claude-sonnet-4.5";

export const roleToModel: Record<string, string> = {
	coder: CODER_MODEL,
	browser: MANAGER_MODEL,
	designer: MANAGER_MODEL,
	researcher: REASONING_MODEL,
	copywriter: REASONING_MODEL,
	general: REASONING_MODEL,
};

// Model mapping for reference
export const modelMap = {
	manager: MANAGER_MODEL,
	coder: CODER_MODEL,
	general: REASONING_MODEL,
	routing: ROUTING_MODEL,
	reasoning: REASONING_MODEL,
} as const;
