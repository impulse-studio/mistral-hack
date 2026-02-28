import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import type { KanbanTaskDetailModalProps } from "./KanbanTaskDetailModal.component";

import { KanbanTaskDetailModal } from "./KanbanTaskDetailModal.component";

const meta = {
	title: "managed/KanbanTaskDetailModal",
	component: KanbanTaskDetailModal,
	argTypes: {
		priority: {
			control: "select",
			options: ["none", "low", "medium", "high", "urgent"],
		},
		onClose: { action: "closed" },
		onOpenTerminal: { action: "openTerminal" },
		onOpenFiles: { action: "openFiles" },
	},
} satisfies Meta<typeof KanbanTaskDetailModal>;

export default meta;
type Story = StoryObj<typeof meta>;

function KanbanTaskDetailModalStory(props: KanbanTaskDetailModalProps) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="border-2 border-border bg-card px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-foreground shadow-pixel inset-shadow-pixel"
			>
				Open Modal
			</button>
			<KanbanTaskDetailModal {...props} open={open} onClose={() => setOpen(false)} />
		</>
	);
}

export const FullDetail: Story = {
	args: {
		open: false,
		onClose: () => {},
		id: "AIO-42",
		title: "Implement agent orchestration pipeline",
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
		onOpenTerminal: () => {},
		onOpenFiles: () => {},
	},
	render: (args) => <KanbanTaskDetailModalStory {...args} />,
};

export const Minimal: Story = {
	args: {
		open: true,
		onClose: () => {},
		id: "AIO-99",
		title: "Update README with setup instructions",
	},
};

export const WithReasoning: Story = {
	args: {
		open: false,
		onClose: () => {},
		id: "AIO-55",
		title: "Research WebSocket reconnection strategies",
		description: "Investigate best practices for handling dropped connections in real-time apps.",
		priority: "medium",
		labels: [{ text: "Research", color: "cyan" }],
		reasoning:
			"The current Convex client handles reconnections automatically, but we need to understand edge cases where manual intervention may be needed, especially during agent long-running tasks that span multiple minutes.",
		assignee: {
			name: "Nova Agent",
			initials: "NV",
			color: "linear-gradient(135deg, #8B5CF6, #EC4899)",
			status: "thinking",
		},
	},
	render: (args) => <KanbanTaskDetailModalStory {...args} />,
};

export const UrgentBug: Story = {
	args: {
		open: false,
		onClose: () => {},
		id: "AIO-18",
		title: "Fix critical auth bypass in sandbox API endpoint",
		description:
			"A security vulnerability was discovered that allows unauthenticated access to sandbox execution endpoints. This must be patched immediately.",
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
		onOpenTerminal: () => {},
		onOpenFiles: () => {},
	},
	render: (args) => <KanbanTaskDetailModalStory {...args} />,
};

export const Completed: Story = {
	args: {
		open: false,
		onClose: () => {},
		id: "AIO-33",
		title: "Set up CI pipeline with type checking",
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
	},
	render: (args) => <KanbanTaskDetailModalStory {...args} />,
};
