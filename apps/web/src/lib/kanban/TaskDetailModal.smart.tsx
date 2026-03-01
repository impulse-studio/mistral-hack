import { api } from "@mistral-hack/backend/convex/_generated/api";
import type { GenericId } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { useCallback } from "react";

import type {
	KanbanTaskAssignee,
	KanbanTaskComment,
	KanbanTaskSubtaskItem,
} from "./TaskDetailModal.component";
import { KanbanTaskDetail } from "./TaskDetailModal.component";

// ── Agent status mapping ────────────────────────────────

const KANBAN_AGENT_STATUS_MAP: Record<string, KanbanTaskAssignee["status"]> = {
	idle: "idle",
	thinking: "thinking",
	working: "coding",
	completed: "done",
	failed: "error",
	despawning: "idle",
};

// ── Types ───────────────────────────────────────────────

interface KanbanTaskDetailSmartProps {
	taskId: string | null;
	onClose: () => void;
}

// ── Component ───────────────────────────────────────────

function KanbanTaskDetailSmart({ taskId, onClose }: KanbanTaskDetailSmartProps) {
	const typedTaskId = taskId as GenericId<"tasks"> | null;

	const task = useQuery(api.tasks.queries.get, typedTaskId ? { taskId: typedTaskId } : "skip");
	const subtasks = useQuery(
		api.tasks.queries.listSubTasks,
		typedTaskId ? { parentTaskId: typedTaskId } : "skip",
	);
	const comments = useQuery(
		api.tasks.comments.listByTask,
		typedTaskId ? { taskId: typedTaskId } : "skip",
	);
	const agentData = useQuery(
		api.office.queries.getAgent,
		task?.assignedTo ? { agentId: task.assignedTo } : "skip",
	);

	const addCommentMutation = useMutation(api.tasks.comments.add);

	const handleAddComment = useCallback(
		(content: string) => {
			if (!typedTaskId) return;
			addCommentMutation({ taskId: typedTaskId, content, author: "user" });
		},
		[typedTaskId, addCommentMutation],
	);

	// ── Data mapping ────────────────────────────────────

	const mappedSubtasks: KanbanTaskSubtaskItem[] | undefined =
		subtasks && subtasks.length > 0
			? subtasks.map((s) => ({
					id: s._id,
					title: s.title,
					done: s.status === "done",
				}))
			: undefined;

	const mappedComments: KanbanTaskComment[] | undefined = comments?.map((c) => ({
		id: c._id,
		author: c.author,
		content: c.content,
		createdAt: c.createdAt,
	}));

	const mappedAssignee: KanbanTaskAssignee | undefined = agentData?.agent
		? {
				name: agentData.agent.name,
				initials: agentData.agent.name.slice(0, 2).toUpperCase(),
				color: agentData.agent.color,
				status: KANBAN_AGENT_STATUS_MAP[agentData.agent.status],
			}
		: undefined;

	const mappedLabels: Array<{ text: string; color: "orange" | "blue" | "muted" }> | undefined = task
		? [
				{
					text: task.createdBy === "manager" ? "Manager" : "User",
					color: task.createdBy === "manager" ? ("orange" as const) : ("blue" as const),
				},
				...(task.estimatedMinutes
					? [{ text: `${task.estimatedMinutes}m`, color: "muted" as const }]
					: []),
			]
		: undefined;

	return (
		<KanbanTaskDetail
			open={!!taskId && !!task}
			onClose={onClose}
			id={task?._id ?? ""}
			title={task?.title ?? ""}
			status={task?.status ?? "backlog"}
			description={task?.description}
			labels={mappedLabels}
			subtasks={mappedSubtasks}
			assignee={mappedAssignee}
			comments={mappedComments ?? []}
			result={task?.result}
			error={task?.error}
			createdAt={task?.createdAt}
			startedAt={task?.startedAt}
			completedAt={task?.completedAt}
			onAddComment={handleAddComment}
		/>
	);
}

export { KanbanTaskDetailSmart };
export type { KanbanTaskDetailSmartProps };
