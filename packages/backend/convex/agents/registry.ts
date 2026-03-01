import { managerAgent } from "./manager/agent";
import { coderAgent } from "./coder/agent";
import { copywriterAgent } from "./copywriter/agent";
import { generalAgent } from "./general/agent";
import { browserAgent } from "./browser/agent";

// Agent registry — maps role names to agent configs
export const agentRegistry = {
	manager: managerAgent,
	coder: coderAgent,
	browser: browserAgent,
	designer: browserAgent, // shares browser agent for now
	researcher: generalAgent,
	copywriter: copywriterAgent,
	general: generalAgent,
} as const;
