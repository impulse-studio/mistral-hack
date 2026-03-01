import { api } from "@mistral-hack/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo } from "react";

import { KanbanAgentModal, type KanbanAgentWithTasks } from "./AgentKanbanModal.component";

// ── Types ───────────────────────────────────────────────

interface KanbanAgentModalSmartProps {
	open: boolean;
	onClose: () => void;
	onTaskClick?: (taskId: string) => void;
	onAgentClick?: (agentId: string) => void;
}

// ── Component ───────────────────────────────────────────

function KanbanAgentModalSmart({
	open,
	onClose,
	onTaskClick,
	onAgentClick,
}: KanbanAgentModalSmartProps) {
	const activeAgents = useQuery(api.office.queries.getActiveAgents, open ? {} : "skip");
	const allTasks = useQuery(api.tasks.queries.list, open ? {} : "skip");

	const agents: KanbanAgentWithTasks[] = useMemo(() => {
		if (!activeAgents || !allTasks) return [];

		// Build a map: agentId → tasks
		const tasksByAgent = new Map<string, KanbanAgentWithTasks["tasks"]>();
		for (const task of allTasks) {
			if (!task.assignedTo) continue;
			const agentId = String(task.assignedTo);
			if (!tasksByAgent.has(agentId)) tasksByAgent.set(agentId, []);
			tasksByAgent.get(agentId)!.push({
				id: task._id,
				title: task.title,
				status: task.status,
			});
		}

		return activeAgents.map((agent) => ({
			id: agent._id,
			name: agent.name,
			role: agent.role,
			color: agent.color,
			status: agent.status,
			tasks: tasksByAgent.get(agent._id) ?? [],
		}));
	}, [activeAgents, allTasks]);

	return (
		<KanbanAgentModal
			open={open}
			onClose={onClose}
			agents={agents}
			onTaskClick={onTaskClick}
			onAgentClick={onAgentClick}
		/>
	);
}

export { KanbanAgentModalSmart };
export type { KanbanAgentModalSmartProps };
