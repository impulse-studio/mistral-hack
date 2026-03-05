import { createGateway } from "ai";

const gateway = createGateway({
	apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
});

export const mistral = gateway;

export const MANAGER_MODEL = "mistral/mistral-large-3";
export const CODER_MODEL = "mistral/devstral-2";
export const ROUTING_MODEL = "mistral/mistral-small";
export const REASONING_MODEL = "mistral/magistral-medium";

export const roleToModel: Record<string, string> = {
	coder: CODER_MODEL,
	browser: MANAGER_MODEL,
	designer: MANAGER_MODEL,
	researcher: REASONING_MODEL,
	copywriter: MANAGER_MODEL,
	general: MANAGER_MODEL,
};

// Model mapping for reference
export const modelMap = {
	manager: MANAGER_MODEL,
	coder: CODER_MODEL,
	general: MANAGER_MODEL,
	routing: ROUTING_MODEL,
	reasoning: REASONING_MODEL,
} as const;
