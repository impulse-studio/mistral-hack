import { PixelBadge } from "@/lib/pixel/PixelBadge";
import { PixelBorderBox } from "@/lib/pixel/PixelBorderBox";
import { PixelText } from "@/lib/pixel/PixelText";
import { cn } from "@/lib/utils";

import { KanbanColumn } from "./KanbanColumn.component";
import { KanbanEmptyState } from "./EmptyState.component";
import type { KanbanItemLabel, KanbanItemProps } from "./KanbanItem.component";

const EMPTY_ITEMS: KanbanItemProps[] = [];

type KanbanTaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done" | "failed";
type KanbanTaskPriority = NonNullable<KanbanItemProps["priority"]>;

interface KanbanBoardTask {
	id: string;
	title: string;
	status: KanbanTaskStatus;
	priority?: KanbanTaskPriority;
	labels?: KanbanItemLabel[];
	subtasksDone?: number;
	subtasksTotal?: number;
	assigneeInitials?: string;
	assigneeColor?: string;
}

interface KanbanBoardFilters {
	statuses?: KanbanTaskStatus[];
	priorities?: KanbanTaskPriority[];
	assignees?: string[];
	labels?: string[];
	search?: string;
}

interface KanbanBoardReadonlyProps {
	tasks: KanbanBoardTask[];
	filters?: KanbanBoardFilters;
	title?: string;
	showFilterSummary?: boolean;
	onTaskClick?: (id: string) => void;
	className?: string;
}

const KANBAN_COLUMN_ORDER: Array<{
	status: KanbanTaskStatus;
	title: string;
	accentColor: string;
}> = [
	{ status: "backlog", title: "Backlog", accentColor: "muted-foreground" },
	{ status: "todo", title: "Todo", accentColor: "orange-500" },
	{ status: "in_progress", title: "In Progress", accentColor: "blue-500" },
	{ status: "review", title: "Review", accentColor: "yellow-500" },
	{ status: "done", title: "Done", accentColor: "green-500" },
	{ status: "failed", title: "Failed", accentColor: "red-500" },
];

function normalizeToken(value: string) {
	return value.trim().toLowerCase();
}

function filterTasks(tasks: KanbanBoardTask[], filters: KanbanBoardFilters): KanbanBoardTask[] {
	const hasStatuses = Boolean(filters.statuses && filters.statuses.length > 0);
	const hasPriorities = Boolean(filters.priorities && filters.priorities.length > 0);
	const hasAssignees = Boolean(filters.assignees && filters.assignees.length > 0);
	const hasLabels = Boolean(filters.labels && filters.labels.length > 0);
	const search = normalizeToken(filters.search ?? "");

	return tasks.filter((task) => {
		if (hasStatuses && !filters.statuses!.includes(task.status)) {
			return false;
		}

		if (hasPriorities && !filters.priorities!.includes(task.priority ?? "none")) {
			return false;
		}

		if (hasAssignees) {
			const assignee = task.assigneeInitials ? normalizeToken(task.assigneeInitials) : "";
			const hasAssigneeMatch = filters.assignees!.some(
				(value) => normalizeToken(value) === assignee,
			);
			if (!hasAssigneeMatch) {
				return false;
			}
		}

		if (hasLabels) {
			const taskLabels = new Set((task.labels ?? []).map((label) => normalizeToken(label.text)));
			const hasLabelMatch = filters.labels!.some((label) => taskLabels.has(normalizeToken(label)));
			if (!hasLabelMatch) {
				return false;
			}
		}

		if (search.length === 0) {
			return true;
		}

		const haystack = [
			task.id,
			task.title,
			task.assigneeInitials,
			...(task.labels ?? []).map((label) => label.text),
		]
			.filter(Boolean)
			.join(" ")
			.toLowerCase();

		return haystack.includes(search);
	});
}

function formatFilterSummary(filters: KanbanBoardFilters) {
	const pieces: string[] = [];

	if (filters.statuses && filters.statuses.length > 0) {
		pieces.push(`Status: ${filters.statuses.join(", ")}`);
	}

	if (filters.priorities && filters.priorities.length > 0) {
		pieces.push(`Priority: ${filters.priorities.join(", ")}`);
	}

	if (filters.assignees && filters.assignees.length > 0) {
		pieces.push(`Assignee: ${filters.assignees.join(", ")}`);
	}

	if (filters.labels && filters.labels.length > 0) {
		pieces.push(`Labels: ${filters.labels.join(", ")}`);
	}

	if (filters.search && filters.search.trim().length > 0) {
		pieces.push(`Search: ${filters.search.trim()}`);
	}

	return pieces;
}

function KanbanBoardReadonly({
	tasks,
	filters = {},
	title = "Kanban Board",
	showFilterSummary = true,
	onTaskClick,
	className,
}: KanbanBoardReadonlyProps) {
	const filteredTasks = filterTasks(tasks, filters);
	const filterSummary = formatFilterSummary(filters);

	const groupedByStatus = new Map<KanbanTaskStatus, KanbanItemProps[]>(
		KANBAN_COLUMN_ORDER.map((column) => [column.status, []]),
	);

	for (const task of filteredTasks) {
		const list = groupedByStatus.get(task.status);
		if (!list) continue;

		list.push({
			id: task.id,
			title: task.title,
			priority: task.priority,
			labels: task.labels,
			subtasksDone: task.subtasksDone,
			subtasksTotal: task.subtasksTotal,
			assigneeInitials: task.assigneeInitials,
			assigneeColor: task.assigneeColor,
		});
	}

	const activeStatuses = new Set(filters.statuses ?? []);
	const visibleColumns = KANBAN_COLUMN_ORDER.filter((column) => {
		if (activeStatuses.size === 0) {
			return column.status !== "failed";
		}
		return activeStatuses.has(column.status);
	});

	return (
		<section
			data-slot="kanban-board-readonly"
			className={cn("flex h-full flex-col gap-4", className)}
		>
			<PixelBorderBox className="flex items-center justify-between gap-4 px-4 py-3">
				<div className="flex min-w-0 flex-col gap-1">
					<PixelText as="h2" variant="heading">
						{title}
					</PixelText>
					{showFilterSummary && (
						<PixelText variant="body" color="muted" className="line-clamp-2">
							{filterSummary.length > 0 ? filterSummary.join(" | ") : "No filters applied"}
						</PixelText>
					)}
				</div>
				<PixelBadge color="cyan" size="md">
					Readonly
				</PixelBadge>
			</PixelBorderBox>

			{filteredTasks.length === 0 ? (
				<KanbanEmptyState
					variant="board"
					title="No matching tasks"
					description="Try broadening the filter settings passed into this board."
				/>
			) : (
				<div className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-2">
					{visibleColumns.map((column) => (
						<KanbanColumn
							key={column.status}
							title={column.title}
							status={column.status}
							items={groupedByStatus.get(column.status) ?? EMPTY_ITEMS}
							accentColor={column.accentColor}
							readOnly
							onItemClick={onTaskClick}
						/>
					))}
				</div>
			)}
		</section>
	);
}

export { KanbanBoardReadonly };
export type { KanbanBoardReadonlyProps, KanbanBoardFilters, KanbanBoardTask, KanbanTaskStatus };
