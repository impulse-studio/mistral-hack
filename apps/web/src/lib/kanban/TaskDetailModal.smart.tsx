import { api } from "@mistral-hack/backend/convex/_generated/api";
import type { GenericId } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo } from "react";

import type {
	KanbanTaskAssignee,
	KanbanTaskComment,
	KanbanTaskDependency,
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
	onOpenAgentSession?: (agentId: string) => void;
}

// ── Component ───────────────────────────────────────────

function KanbanTaskDetailSmart({
	taskId,
	onClose,
	onOpenAgentSession,
}: KanbanTaskDetailSmartProps) {
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
	const depInfo = useQuery(
		api.tasks.dependencies.getDependencyInfo,
		typedTaskId ? { taskId: typedTaskId } : "skip",
	);
	const agentData = useQuery(
		api.office.queries.getAgent,
		task?.assignedTo ? { agentId: task.assignedTo } : "skip",
	);

	const addCommentMutation = useMutation(api.tasks.comments.add);

	const handleOpenTerminal = useCallback(() => {
		if (!task?.assignedTo || !onOpenAgentSession) return;
		onClose();
		onOpenAgentSession(String(task.assignedTo));
	}, [task?.assignedTo, onOpenAgentSession, onClose]);

	const handleAddComment = useCallback(
		(content: string) => {
			if (!typedTaskId) return;
			addCommentMutation({ taskId: typedTaskId, content, author: "user" });
		},
		[typedTaskId, addCommentMutation],
	);

	// ── Data mapping ────────────────────────────────────

	const mappedSubtasks = useMemo<KanbanTaskSubtaskItem[] | undefined>(
		() =>
			subtasks && subtasks.length > 0
				? subtasks.map((s) => ({
						id: s._id,
						title: s.title,
						done: s.status === "done",
						cancelled: s.status === "cancelled",
					}))
				: undefined,
		[subtasks],
	);

	const mappedComments = useMemo<KanbanTaskComment[] | undefined>(
		() =>
			comments?.map((c) => ({
				id: c._id,
				author: c.author,
				content: c.content,
				createdAt: c.createdAt,
			})),
		[comments],
	);

	const mappedAssignee = useMemo<KanbanTaskAssignee | undefined>(
		() =>
			agentData?.agent
				? {
						name: agentData.agent.name,
						initials: agentData.agent.name.slice(0, 2).toUpperCase(),
						color: agentData.agent.color,
						status: KANBAN_AGENT_STATUS_MAP[agentData.agent.status],
					}
				: undefined,
		[agentData?.agent],
	);

	const mappedDependencies = useMemo<
		{ dependsOn: KanbanTaskDependency[]; blocks: KanbanTaskDependency[] } | undefined
	>(
		() =>
			depInfo
				? {
						dependsOn: depInfo.dependsOn.map((d) => ({
							id: d.id,
							title: d.title,
							status: d.status,
							done: d.status === "done",
						})),
						blocks: depInfo.blocks.map((d) => ({
							id: d.id,
							title: d.title,
							status: d.status,
							done: d.status === "done",
						})),
					}
				: undefined,
		[depInfo],
	);

	const mappedLabels = useMemo<
		Array<{ text: string; color: "orange" | "blue" | "muted" }> | undefined
	>(
		() =>
			task
				? [
						{
							text: task.createdBy === "manager" ? "Manager" : "User",
							color: task.createdBy === "manager" ? ("orange" as const) : ("blue" as const),
						},
						...(task.estimatedMinutes
							? [{ text: `${task.estimatedMinutes}m`, color: "muted" as const }]
							: []),
					]
				: undefined,
		[task],
	);

	const commentsProp = useMemo(() => mappedComments ?? [], [mappedComments]);

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
			dependencies={mappedDependencies}
			assignee={mappedAssignee}
			comments={commentsProp}
			result={task?.result}
			error={task?.error}
			createdAt={task?.createdAt}
			startedAt={task?.startedAt}
			completedAt={task?.completedAt}
			onAddComment={handleAddComment}
			onOpenTerminal={task?.assignedTo && onOpenAgentSession ? handleOpenTerminal : undefined}
			debug={true}
		/>
	);
}

export { KanbanTaskDetailSmart };
export type { KanbanTaskDetailSmartProps };
