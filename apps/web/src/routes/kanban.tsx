import { api } from "@mistral-hack/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";

import {
	KanbanBoard,
	type KanbanBoardFilters,
	type KanbanBoardTask,
} from "@/lib/kanban/KanbanBoard.component";

export const Route = createFileRoute("/kanban")({
	component: RouteComponent,
});

const readonlyFilters: KanbanBoardFilters = {
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

function RouteComponent() {
	const kanbanData = useQuery(api.tasks.queries.getKanban);

	if (kanbanData === undefined) {
		return (
			<div className="p-4">
				<div className="border-2 border-border bg-card px-4 py-3 shadow-pixel inset-shadow-pixel">
					Loading kanban board...
				</div>
			</div>
		);
	}

	const tasks = mapKanbanToTasks(kanbanData as Record<string, Array<Record<string, unknown>>>);

	return (
		<div className="h-full overflow-hidden p-4">
			<KanbanBoard
				title="Office Kanban"
				tasks={tasks}
				filters={readonlyFilters}
				readOnly
				className="h-full"
			/>
		</div>
	);
}
