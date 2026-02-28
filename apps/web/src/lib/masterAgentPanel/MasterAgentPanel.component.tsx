import { api } from "@mistral-hack/backend/convex/_generated/api";
import { useQuery } from "convex/react";

import { cn } from "@/lib/utils";

import { ChatWindowSmart } from "../chat/ChatWindow.smart";
import {
	KanbanBoardReadonly,
	type KanbanBoardFilters,
	type KanbanBoardTask,
} from "../kanban/KanbanBoardReadonly.component";

const KANBAN_FILTERS: KanbanBoardFilters = {
	statuses: ["backlog", "todo", "in_progress", "review", "done"],
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
	const orderedStatuses = ["backlog", "todo", "in_progress", "review", "done", "failed"];
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

interface MasterAgentPanelProps {
	className?: string;
}

function MasterAgentPanel({ className }: MasterAgentPanelProps) {
	const kanbanData = useQuery(api.tasks.queries.getKanban);
	const tasks = kanbanData
		? mapKanbanToTasks(kanbanData as Record<string, Array<Record<string, unknown>>>)
		: [];

	return (
		<div className={cn("flex h-full gap-4", className)}>
			{/* Left: Manager Chat */}
			<div className="flex h-full w-[420px] shrink-0 flex-col">
				<ChatWindowSmart variant="panel" title="Manager" />
			</div>

			{/* Right: Kanban Board */}
			<div className="flex min-w-0 flex-1 flex-col">
				<KanbanBoardReadonly
					title="Task Board"
					tasks={tasks}
					filters={KANBAN_FILTERS}
					className="h-full"
				/>
			</div>
		</div>
	);
}

export { MasterAgentPanel };
export type { MasterAgentPanelProps };
