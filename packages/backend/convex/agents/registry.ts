import { managerAgent } from "./manager/agent";
import { coderAgent } from "./coder/agent";
import { generalAgent } from "./general/agent";

// Agent registry — maps role names to agent configs
export const agentRegistry = {
	manager: managerAgent,
	coder: coderAgent,
	researcher: generalAgent,
	copywriter: generalAgent,
	general: generalAgent,
} as const;
