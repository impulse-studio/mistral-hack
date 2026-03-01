import { api } from "@mistral-hack/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { AgentCard } from "@/lib/agent/AgentCard.component";
import { AgentSessionModalSmart } from "@/lib/agent/AgentSessionModal.smart";
import { PixelBadge } from "@/lib/pixel/PixelBadge";
import { PixelBorderBox } from "@/lib/pixel/PixelBorderBox";
import { PixelDivider } from "@/lib/pixel/PixelDivider";
import { PixelGlow } from "@/lib/pixel/PixelGlow";
import { PixelText } from "@/lib/pixel/PixelText";
import { cn } from "@/lib/utils";

import { ChatWindowSmart } from "../chat/ChatWindow.smart";
import {
	KanbanBoard,
	type KanbanBoardFilters,
	type KanbanBoardTask,
} from "../kanban/KanbanBoard.component";
import { KanbanTaskDetailSmart } from "../kanban/TaskDetailModal.smart";

type RightPanelTab = "agents" | "tasks";

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
	const [activeTab, setActiveTab] = useState<RightPanelTab>("tasks");
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

	const activeWorkerCount = useMemo(
		() => workerAgents.filter((a) => a.status === "working" || a.status === "thinking").length,
		[workerAgents],
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

	const resetAllWorkers = useMutation(api.office.mutations.resetAllWorkers);
	const [isResetting, setIsResetting] = useState(false);

	const handleCloseAgentSession = useCallback(() => {
		setSelectedAgentId(null);
	}, []);

	const handleReset = useCallback(async () => {
		if (isResetting) return;
		setIsResetting(true);
		try {
			await resetAllWorkers();
		} finally {
			setIsResetting(false);
		}
	}, [resetAllWorkers, isResetting]);

	return (
		<div className={cn("flex h-full gap-4", className)}>
			{/* Left: Manager Chat */}
			<div className="flex h-full w-[420px] shrink-0 flex-col">
				<ChatWindowSmart variant="panel" title="Manager" acceptTaskDrop />
			</div>

			{/* Right: Tabbed panel — Agents / Task Board */}
			<div className="flex min-w-0 flex-1 flex-col">
				{/* Tab bar */}
				<div className="flex">
					<Button
						variant="ghost"
						onClick={() => setActiveTab("agents")}
						className={cn(
							"flex-1 gap-2 rounded-none px-4 py-2.5 font-mono text-[9px] uppercase tracking-widest",
							activeTab === "agents"
								? "border-b-2 border-orange-500 text-orange-400"
								: "border-b-2 border-transparent text-muted-foreground hover:text-foreground",
						)}
					>
						Agents
						{workerAgents.length > 0 && (
							<PixelBadge color={activeWorkerCount > 0 ? "orange" : "muted"} size="sm">
								{workerAgents.length}
							</PixelBadge>
						)}
						{activeWorkerCount > 0 && <PixelGlow color="cyan" pulse size="sm" />}
					</Button>
					<Button
						variant="ghost"
						onClick={() => setActiveTab("tasks")}
						className={cn(
							"flex-1 gap-2 rounded-none px-4 py-2.5 font-mono text-[9px] uppercase tracking-widest",
							activeTab === "tasks"
								? "border-b-2 border-orange-500 text-orange-400"
								: "border-b-2 border-transparent text-muted-foreground hover:text-foreground",
						)}
					>
						Task Board
						{tasks.length > 0 && (
							<PixelBadge color="muted" size="sm">
								{tasks.length}
							</PixelBadge>
						)}
					</Button>

					{/* Reset workers button — always visible so users can clear session state */}
					<Button
						variant="ghost"
						onClick={handleReset}
						disabled={isResetting}
						className="shrink-0 gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2.5 font-mono text-[9px] uppercase tracking-widest text-red-400 hover:text-red-300"
					>
						{isResetting ? "Resetting..." : "Reset"}
					</Button>
				</div>

				<PixelDivider />

				{/* Tab content */}
				<div className="min-h-0 flex-1 overflow-auto">
					{activeTab === "agents" && (
						<AgentsGridView agents={workerAgents} onOpenAgent={handleOpenAgentSession} />
					)}
					{activeTab === "tasks" && (
						<KanbanBoard
							title="Task Board"
							tasks={tasks}
							filters={KANBAN_FILTERS}
							readOnly
							allowDragOut
							onTaskClick={handleTaskClick}
							className="h-full p-2"
						/>
					)}
				</div>
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

// ── Agents grid sub-view ─────────────────────────────────

interface AgentsGridViewProps {
	agents: Array<{
		_id: string;
		name: string;
		role: string;
		status: string;
		color: string;
		currentTaskId?: string | null;
	}>;
	onOpenAgent: (agentId: string) => void;
}

function AgentsGridView({ agents, onOpenAgent }: AgentsGridViewProps) {
	if (agents.length === 0) {
		return (
			<div className="flex h-full items-center justify-center p-8">
				<PixelBorderBox variant="dashed" className="max-w-sm p-6 text-center">
					<PixelText variant="heading" color="muted" className="mb-2">
						No agents active
					</PixelText>
					<PixelText variant="body" color="muted">
						Agents will appear here when the manager assigns work. Use the chat to give
						instructions.
					</PixelText>
				</PixelBorderBox>
			</div>
		);
	}

	return (
		<div className="grid auto-rows-min grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 p-3">
			{agents.map((agent) => (
				<AgentCard
					key={agent._id}
					id={String(agent._id).slice(-6)}
					name={agent.name}
					role={agent.role}
					status={AGENT_CARD_STATUS_MAP[agent.status] ?? "idle"}
					currentTask={agent.currentTaskId ? "Working..." : undefined}
					avatarInitials={agent.name.slice(0, 2).toUpperCase()}
					avatarColor={agent.color}
					onClick={() => onOpenAgent(String(agent._id))}
				/>
			))}
		</div>
	);
}

export { MasterAgentPanel };
export type { MasterAgentPanelProps };
