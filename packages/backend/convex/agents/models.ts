import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";

// Bedrock provider — uses AWS_BEARER_TOKEN_BEDROCK env var for auth
export const mistral = createAmazonBedrock({
	region: "us-west-2",
});

// ── Model ID constants (Bedrock Mistral model IDs) ──────────
export const MANAGER_MODEL = "mistral.mistral-large-3-675b-instruct";
export const CODER_MODEL = "mistral.devstral-2-123b";
export const ROUTING_MODEL = "mistral.ministral-3-8b-instruct";
export const REASONING_MODEL = "mistral.magistral-small-2509";

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
