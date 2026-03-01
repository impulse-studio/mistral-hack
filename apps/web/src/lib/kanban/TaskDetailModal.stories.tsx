import { useCallback, useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import type { KanbanTaskComment, KanbanTaskDetailProps } from "./TaskDetailModal.component";

import { KanbanTaskDetail } from "./TaskDetailModal.component";

const now = Date.now();
const hour = 3_600_000;
const day = 86_400_000;

const sampleComments: KanbanTaskComment[] = [
	{
		id: "c-1",
		author: "manager",
		content:
			"Decomposing this into three sub-tasks: protocol definition, queue implementation, and integration tests. Starting with the protocol since everything depends on it.",
		createdAt: now - 4 * hour,
	},
	{
		id: "c-2",
		author: "agent",
		agentName: "Spark Agent",
		content:
			"Protocol definition complete. Using JSON-RPC style messages over the Convex mutation layer. See /home/company/docs/protocol.md for the spec.",
		createdAt: now - 2 * hour,
	},
	{
		id: "c-3",
		author: "user",
		content: "Looks good — make sure we handle the case where a sandbox crashes mid-execution.",
		createdAt: now - 45 * 60_000,
	},
	{
		id: "c-4",
		author: "system",
		content: "Task dependency resolved: AIO-40 (scaffold sandbox lifecycle) completed.",
		createdAt: now - 10 * 60_000,
	},
];

const meta = {
	title: "managed/KanbanTaskDetail",
	component: KanbanTaskDetail,
	argTypes: {
		priority: {
			control: "select",
			options: ["none", "low", "medium", "high", "urgent"],
		},
		status: {
			control: "select",
			options: ["backlog", "todo", "in_progress", "review", "done", "failed"],
		},
		onClose: { action: "closed" },
		onOpenTerminal: { action: "openTerminal" },
		onOpenFiles: { action: "openFiles" },
	},
} satisfies Meta<typeof KanbanTaskDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

function KanbanTaskDetailStory(props: KanbanTaskDetailProps) {
	const [open, setOpen] = useState(false);
	const [comments, setComments] = useState(props.comments ?? []);

	const handleAddComment = useCallback((content: string) => {
		setComments((prev) => [
			...prev,
			{
				id: `c-${Date.now()}`,
				author: "user" as const,
				content,
				createdAt: Date.now(),
			},
		]);
	}, []);

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="border-2 border-border bg-card px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-foreground shadow-pixel inset-shadow-pixel"
			>
				Open Task Detail
			</button>
			<KanbanTaskDetail
				{...props}
				open={open}
				comments={comments}
				onClose={() => setOpen(false)}
				onAddComment={handleAddComment}
			/>
		</>
	);
}

export const FullDetail: Story = {
	args: {
		open: false,
		onClose: () => {},
		id: "AIO-42",
		title: "Implement agent orchestration pipeline",
		status: "in_progress",
		description:
			"Build the core orchestration layer that allows the Manager agent to delegate tasks to sub-agents running on shared Daytona sandboxes. Must handle task queuing, status reporting, and error recovery.",
		priority: "high",
		labels: [
			{ text: "Backend", color: "purple" },
			{ text: "Agent", color: "orange" },
			{ text: "Core", color: "blue" },
		],
		subtasks: [
			{ id: "st-1", title: "Define agent communication protocol", done: true },
			{ id: "st-2", title: "Implement task queue with Convex", done: true },
			{ id: "st-3", title: "Add status reporting via subscriptions", done: false },
			{ id: "st-4", title: "Error recovery and retry logic", done: false },
			{ id: "st-5", title: "Integration tests", done: false },
		],
		assignee: {
			name: "Spark Agent",
			initials: "SK",
			color: "linear-gradient(135deg, #06B6D4, #3B82F6)",
			status: "coding",
		},
		comments: sampleComments,
		createdAt: now - 2 * day,
		startedAt: now - 6 * hour,
		onOpenTerminal: () => {},
		onOpenFiles: () => {},
	},
	render: (args) => <KanbanTaskDetailStory {...args} />,
};

export const Minimal: Story = {
	args: {
		open: false,
		onClose: () => {},
		id: "AIO-99",
		title: "Update README with setup instructions",
		status: "backlog",
		createdAt: now - 3 * day,
	},
	render: (args) => <KanbanTaskDetailStory {...args} />,
};

export const WithResult: Story = {
	args: {
		open: false,
		onClose: () => {},
		id: "AIO-33",
		title: "Set up CI pipeline with type checking",
		status: "done",
		description: "Configure GitHub Actions to run bun check-types and tests on every pull request.",
		priority: "medium",
		labels: [
			{ text: "Infra", color: "yellow" },
			{ text: "DevOps", color: "green" },
		],
		subtasks: [
			{ id: "st-1", title: "Create workflow YAML", done: true },
			{ id: "st-2", title: "Add type-check step", done: true },
			{ id: "st-3", title: "Add test runner step", done: true },
			{ id: "st-4", title: "Configure branch protection", done: true },
		],
		assignee: {
			name: "Build Agent",
			initials: "BA",
			color: "linear-gradient(135deg, #22C55E, #10B981)",
			status: "done",
		},
		result:
			"CI pipeline configured. Workflow runs on every PR targeting main. Type checking, linting, and tests all pass. Branch protection enabled.",
		comments: [
			{
				id: "c-1",
				author: "manager",
				content: "Spawning Build Agent to set up CI. Should be straightforward.",
				createdAt: now - 5 * hour,
			},
			{
				id: "c-2",
				author: "agent",
				agentName: "Build Agent",
				content: "All steps complete. Pipeline runs green on the test PR.",
				createdAt: now - 2 * hour,
			},
		],
		createdAt: now - day,
		startedAt: now - 5 * hour,
		completedAt: now - 2 * hour,
	},
	render: (args) => <KanbanTaskDetailStory {...args} />,
};

export const FailedWithError: Story = {
	args: {
		open: false,
		onClose: () => {},
		id: "AIO-18",
		title: "Fix critical auth bypass in sandbox API endpoint",
		status: "failed",
		description:
			"A security vulnerability was discovered that allows unauthenticated access to sandbox execution endpoints.",
		priority: "urgent",
		labels: [
			{ text: "Bug", color: "red" },
			{ text: "Security", color: "red" },
			{ text: "Backend", color: "purple" },
		],
		subtasks: [
			{ id: "st-1", title: "Reproduce the vulnerability", done: true },
			{ id: "st-2", title: "Add auth middleware to sandbox routes", done: false },
			{ id: "st-3", title: "Write regression tests", done: false },
		],
		assignee: {
			name: "Patch Agent",
			initials: "PA",
			color: "linear-gradient(135deg, #EF4444, #F97316)",
			status: "error",
		},
		error:
			"Sandbox connection timeout after 60s — Daytona workspace unreachable. Retry limit exceeded (3/3).",
		comments: [
			{
				id: "c-1",
				author: "manager",
				content: "Critical issue — assigning immediately with highest priority.",
				createdAt: now - 3 * hour,
			},
			{
				id: "c-2",
				author: "system",
				content: "Agent Patch Agent failed with exit code 1. Sandbox unreachable.",
				createdAt: now - hour,
			},
		],
		createdAt: now - 4 * hour,
		startedAt: now - 3 * hour,
		onOpenTerminal: () => {},
		onOpenFiles: () => {},
	},
	render: (args) => <KanbanTaskDetailStory {...args} />,
};

export const NoComments: Story = {
	args: {
		open: false,
		onClose: () => {},
		id: "AIO-55",
		title: "Research WebSocket reconnection strategies",
		status: "todo",
		description: "Investigate best practices for handling dropped connections in real-time apps.",
		priority: "medium",
		labels: [{ text: "Research", color: "cyan" }],
		reasoning:
			"The current Convex client handles reconnections automatically, but we need to understand edge cases where manual intervention may be needed.",
		comments: [],
		createdAt: now - day,
	},
	render: (args) => <KanbanTaskDetailStory {...args} />,
};

export const ManyComments: Story = {
	args: {
		open: false,
		onClose: () => {},
		id: "AIO-77",
		title: "Implement pixel-art sprite animation system",
		status: "in_progress",
		priority: "high",
		labels: [
			{ text: "Frontend", color: "blue" },
			{ text: "Animation", color: "pink" },
		],
		assignee: {
			name: "Canvas Agent",
			initials: "CA",
			color: "linear-gradient(135deg, #EC4899, #8B5CF6)",
			status: "coding",
		},
		comments: [
			{
				id: "c-1",
				author: "user",
				content: "We need idle, walking, and working animations for each agent type.",
				createdAt: now - 2 * day,
			},
			{
				id: "c-2",
				author: "manager",
				content:
					"Breaking this into sprite sheet generation and animation state machine. Starting with the state machine.",
				createdAt: now - 2 * day + hour,
			},
			{
				id: "c-3",
				author: "agent",
				agentName: "Canvas Agent",
				content:
					"State machine scaffolded with three states: idle (4 frames, 500ms), walking (6 frames, 100ms), working (8 frames, 150ms). Using requestAnimationFrame for timing.",
				createdAt: now - day,
			},
			{
				id: "c-4",
				author: "user",
				content: "Can we add a thinking animation too? Like a thought bubble appearing.",
				createdAt: now - 12 * hour,
			},
			{
				id: "c-5",
				author: "manager",
				content: "Good idea. Adding thinking state with 4 frames. Canvas Agent, please add this.",
				createdAt: now - 11 * hour,
			},
			{
				id: "c-6",
				author: "agent",
				agentName: "Canvas Agent",
				content:
					"Thinking animation added. Also optimized the sprite sheet loader — now lazy-loads per agent role instead of loading all sheets upfront.",
				createdAt: now - 3 * hour,
			},
			{
				id: "c-7",
				author: "system",
				content: "Sub-task completed: AIO-78 (sprite sheet generation) — all assets ready.",
				createdAt: now - hour,
			},
		],
		createdAt: now - 2 * day,
		startedAt: now - 2 * day + hour,
	},
	render: (args) => <KanbanTaskDetailStory {...args} />,
};
