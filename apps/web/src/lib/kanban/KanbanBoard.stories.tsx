import { useCallback, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import type { KanbanBoardTask, KanbanTaskStatus } from "./KanbanBoard.component";
import { KanbanBoard } from "./KanbanBoard.component";

const sampleTasks: KanbanBoardTask[] = [
	{
		id: "AIO-101",
		title: "Design shared task model for manager and workers",
		status: "backlog",
		priority: "medium",
		labels: [{ text: "Backend", color: "purple" }],
		assigneeInitials: "SK",
		assigneeColor: "linear-gradient(135deg, #06B6D4, #3B82F6)",
	},
	{
		id: "AIO-102",
		title: "Create read-only board rendering component",
		status: "todo",
		priority: "high",
		labels: [
			{ text: "Frontend", color: "blue" },
			{ text: "Kanban", color: "orange" },
		],
		subtasksDone: 1,
		subtasksTotal: 4,
		assigneeInitials: "JL",
		assigneeColor: "linear-gradient(135deg, #6366F1, #8B5CF6)",
	},
	{
		id: "AIO-103",
		title: "Map Convex task docs into board card model",
		status: "in_progress",
		priority: "urgent",
		labels: [{ text: "Integration", color: "cyan" }],
		assigneeInitials: "MP",
		assigneeColor: "linear-gradient(135deg, #F97316, #EF4444)",
	},
	{
		id: "AIO-104",
		title: "Review board column empty-state copy",
		status: "review",
		priority: "low",
		labels: [{ text: "UX", color: "pink" }],
	},
	{
		id: "AIO-105",
		title: "Ship /kanban route with readonly defaults",
		status: "done",
		priority: "none",
		labels: [{ text: "Routing", color: "green" }],
		subtasksDone: 3,
		subtasksTotal: 3,
	},
	{
		id: "AIO-106",
		title: "Fix failed worker reconciliation edge case",
		status: "failed",
		priority: "high",
		labels: [{ text: "Ops", color: "red" }],
		assigneeInitials: "OP",
	},
];

const meta = {
	title: "managed/KanbanBoard",
	component: KanbanBoard,
	decorators: [
		(Story) => (
			<div className="h-[760px] bg-background p-6">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof KanbanBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Readonly: Story = {
	args: {
		title: "Agent Task Board",
		tasks: sampleTasks,
		readOnly: true,
		filters: {
			statuses: ["backlog", "todo", "waiting", "in_progress", "review", "done"],
		},
	},
};

export const Interactive: Story = {
	args: {
		title: "Agent Task Board",
		tasks: sampleTasks,
		readOnly: false,
		filters: {
			statuses: ["backlog", "todo", "waiting", "in_progress", "review", "done"],
		},
	},
	render: function InteractiveBoard(args) {
		const [tasks, setTasks] = useState(args.tasks);

		const handleTaskMove = useCallback(
			(taskId: string, _fromStatus: KanbanTaskStatus, toStatus: KanbanTaskStatus) => {
				setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: toStatus } : t)));
			},
			[],
		);

		return <KanbanBoard {...args} tasks={tasks} onTaskMove={handleTaskMove} />;
	},
};

export const FocusedFilters: Story = {
	args: {
		title: "Agent Task Board",
		tasks: sampleTasks,
		readOnly: true,
		filters: {
			statuses: ["todo", "in_progress", "review"],
			priorities: ["high", "urgent"],
			labels: ["Kanban", "Integration"],
		},
	},
};

export const EmptyResult: Story = {
	args: {
		title: "Agent Task Board",
		tasks: sampleTasks,
		filters: {
			search: "does-not-exist",
		},
	},
};
