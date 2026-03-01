import { api } from "@mistral-hack/backend/convex/_generated/api";
import type { GenericId } from "convex/values";
import { useQuery } from "convex/react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import type { TerminalLine } from "@/lib/terminal/TerminalOutput.component";

import { AgentSessionPanel } from "./AgentSessionPanel.component";
import type { AgentSessionAgent, AgentSessionTask } from "./AgentSessionPanel.component";

// ── Helpers ──────────────────────────────────────────────

function mapLogToTerminalText(type: string, content: string): string {
	switch (type) {
		case "command":
			return `$ ${content}`;
		case "stderr":
			return `[stderr] ${content}`;
		case "status":
			return `[status] ${content}`;
		case "tool_call":
			return `[tool] ${content}`;
		case "tool_result":
			return `[tool-result] ${content}`;
		case "screenshot":
			return `[screenshot] ${content}`;
		default:
			return content;
	}
}

const AGENT_STATUS_MAP: Record<string, string> = {
	idle: "idle",
	thinking: "thinking",
	working: "working",
	completed: "done",
	failed: "error",
	despawning: "idle",
};

// ── Types ────────────────────────────────────────────────

interface AgentSessionModalSmartProps {
	agentId: string | null;
	open: boolean;
	onClose: () => void;
}

// ── Component ────────────────────────────────────────────

const EMPTY_TERMINAL: TerminalLine[] = [];
const EMPTY_TASKS: AgentSessionTask[] = [];
const EMPTY_REASONING: never[] = [];

function AgentSessionModalSmart({ agentId, open, onClose }: AgentSessionModalSmartProps) {
	const typedAgentId = agentId as GenericId<"agents"> | null;

	const agentData = useQuery(
		api.office.queries.getAgent,
		typedAgentId ? { agentId: typedAgentId } : "skip",
	);

	const agentLogs = useQuery(
		api.logs.queries.streamForAgent,
		typedAgentId ? { agentId: typedAgentId, limit: 300 } : "skip",
	);

	const agentTasks = useQuery(
		api.tasks.queries.listByAgent,
		typedAgentId ? { agentId: typedAgentId } : "skip",
	);

	const terminalLines: TerminalLine[] = useMemo(() => {
		if (!agentLogs) return EMPTY_TERMINAL;
		return agentLogs.map((log) => ({
			id: String(log._id),
			text: mapLogToTerminalText(log.type, log.content),
			timestamp: log.timestamp,
		}));
	}, [agentLogs]);

	const tasks: AgentSessionTask[] = useMemo(() => {
		if (!agentTasks) return EMPTY_TASKS;
		return agentTasks.map((t) => ({
			id: String(t._id),
			title: t.title,
			status: t.status,
		}));
	}, [agentTasks]);

	const agent: AgentSessionAgent | null = useMemo(() => {
		if (!agentData?.agent) return null;
		const a = agentData.agent;
		return {
			id: String(a._id),
			name: a.name,
			role: a.role,
			color: a.color,
			status: AGENT_STATUS_MAP[a.status] ?? a.status,
			type: a.type,
		};
	}, [agentData]);

	return (
		<Dialog
			open={open && !!agent}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose();
			}}
		>
			<DialogContent className="flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden p-0">
				{/* Close button */}
				<div className="absolute right-3 top-3 z-10">
					<DialogClose
						render={
							<Button variant="ghost" size="icon-xs" className="border-2 border-border bg-card" />
						}
					>
						&times;
					</DialogClose>
				</div>

				{agent && (
					<AgentSessionPanel
						agent={agent}
						tasks={tasks}
						terminalLines={terminalLines}
						reasoningSteps={EMPTY_REASONING}
						className="h-full"
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

export { AgentSessionModalSmart };
export type { AgentSessionModalSmartProps };
