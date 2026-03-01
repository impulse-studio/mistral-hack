import { api } from "@mistral-hack/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";

import { AgentCard } from "@/lib/agent/AgentCard.component";
import { AgentSessionModalSmart } from "@/lib/agent/AgentSessionModal.smart";
import { PixelDivider } from "@/lib/pixel/PixelDivider";
import { PixelText } from "@/lib/pixel/PixelText";
import { cn } from "@/lib/utils";

import { ChatWindowSmart } from "../chat/ChatWindow.smart";
import {
	KanbanBoard,
	type KanbanBoardFilters,
	type KanbanBoardTask,
} from "../kanban/KanbanBoard.component";
import { KanbanTaskDetailSmart } from "../kanban/TaskDetailModal.smart";

const KANBAN_FILTERS: KanbanBoardFilters = {
	statuses: ["backlog", "todo", "waiting", "in_progress", "review", "done"],
	search: "",
};

function extractAssigneeInitials(assigneeId?: string) {
	if (!assigneeId) return undefined;
	const compact = assigneeId.replace(/[^a-zA-Z0-9]/g, "");
	return compact.slice(-2).toUpperCase() || "--";
}

function mapKanbanToTasks(
	kanbanData: Record<string, Array<Record<string, unknown>>>,
): KanbanBoardTask[] {
	const orderedStatuses = ["backlog", "todo", "waiting", "in_progress", "review", "done", "failed"];
	const tasks: KanbanBoardTask[] = [];

	for (const status of orderedStatuses) {
		const group = kanbanData[status];
		if (!Array.isArray(group)) continue;

		for (const task of group) {
			const id = String(task._id ?? "");
			const title = String(task.title ?? "Untitled task");
			const estimatedMinutes =
				typeof task.estimatedMinutes === "number" ? task.estimatedMinutes : undefined;
			const createdBy = task.createdBy === "manager" ? "manager" : "user";
			const assigneeId = task.assignedTo ? String(task.assignedTo) : undefined;

			tasks.push({
				id,
				title,
				status: status as KanbanBoardTask["status"],
				priority: status === "failed" ? "urgent" : status === "in_progress" ? "high" : "none",
				labels: [
					{
						text: createdBy === "manager" ? "Manager" : "User",
						color: createdBy === "manager" ? "orange" : "blue",
					},
					...(estimatedMinutes ? [{ text: `${estimatedMinutes}m`, color: "muted" as const }] : []),
				],
				assigneeInitials: extractAssigneeInitials(assigneeId),
			});
		}
	}

	return tasks;
}

// ── Agent status mapping for AgentCard ───────────────────

const AGENT_CARD_STATUS_MAP: Record<string, "idle" | "coding" | "thinking" | "error" | "done"> = {
	idle: "idle",
	thinking: "thinking",
	working: "coding",
	completed: "done",
	failed: "error",
	despawning: "idle",
};

// ── Component ────────────────────────────────────────────

interface MasterAgentPanelProps {
	className?: string;
}

function MasterAgentPanel({ className }: MasterAgentPanelProps) {
	const kanbanData = useQuery(api.tasks.queries.getKanban);
	const activeAgents = useQuery(api.office.queries.getActiveAgents);
	const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
	const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

	const tasks = useMemo(
		() =>
			kanbanData
				? mapKanbanToTasks(kanbanData as Record<string, Array<Record<string, unknown>>>)
				: [],
		[kanbanData],
	);

	// Filter to worker agents only (manager has its own chat panel)
	const workerAgents = useMemo(
		() => (activeAgents ?? []).filter((a) => a.type === "worker"),
		[activeAgents],
	);

	const handleTaskClick = useCallback((id: string) => {
		setSelectedTaskId(id);
	}, []);

	const handleCloseDetail = useCallback(() => {
		setSelectedTaskId(null);
	}, []);

	const handleOpenAgentSession = useCallback((agentId: string) => {
		setSelectedAgentId(agentId);
	}, []);

	const handleCloseAgentSession = useCallback(() => {
		setSelectedAgentId(null);
	}, []);

	return (
		<div className={cn("flex h-full gap-4", className)}>
			{/* Left: Manager Chat */}
			<div className="flex h-full w-[420px] shrink-0 flex-col">
				<ChatWindowSmart variant="panel" title="Manager" acceptTaskDrop />
			</div>

			{/* Right: Agent Cards + Kanban Board */}
			<div className="flex min-w-0 flex-1 flex-col">
				{/* Agent cards strip */}
				{workerAgents.length > 0 && (
					<>
						<div className="mb-1 flex items-center gap-2 px-1">
							<PixelText variant="label" color="muted">
								Agents ({workerAgents.length})
							</PixelText>
						</div>
						<div className="flex gap-2 overflow-x-auto pb-1 px-1">
							{workerAgents.map((agent) => (
								<AgentCard
									key={agent._id}
									id={String(agent._id).slice(-6)}
									name={agent.name}
									role={agent.role}
									status={AGENT_CARD_STATUS_MAP[agent.status] ?? "idle"}
									currentTask={agent.currentTaskId ? "Working..." : undefined}
									avatarInitials={agent.name.slice(0, 2).toUpperCase()}
									avatarColor={agent.color}
									onClick={() => handleOpenAgentSession(String(agent._id))}
									className="w-[200px] shrink-0"
								/>
							))}
						</div>
						<PixelDivider className="my-2" />
					</>
				)}

				<KanbanBoard
					title="Task Board"
					tasks={tasks}
					filters={KANBAN_FILTERS}
					readOnly
					allowDragOut
					onTaskClick={handleTaskClick}
					className="h-full"
				/>
			</div>

			<KanbanTaskDetailSmart
				taskId={selectedTaskId}
				onClose={handleCloseDetail}
				onOpenAgentSession={handleOpenAgentSession}
			/>

			<AgentSessionModalSmart
				agentId={selectedAgentId}
				open={!!selectedAgentId}
				onClose={handleCloseAgentSession}
			/>
		</div>
	);
}

export { MasterAgentPanel };
export type { MasterAgentPanelProps };
