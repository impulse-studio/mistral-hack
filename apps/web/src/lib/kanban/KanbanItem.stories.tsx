import type { Meta, StoryObj } from "@storybook/react-vite";
import { KanbanItem } from "./KanbanItem.component";

const meta = {
	title: "kanban/KanbanItem",
	component: KanbanItem,
	argTypes: {
		priority: {
			control: "select",
			options: ["none", "low", "medium", "high", "urgent"],
		},
		onClick: { action: "clicked" },
	},
	decorators: [
		(Story) => (
			<div className="w-[280px] bg-background p-4">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof KanbanItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		id: "AIO-42",
		title: "Add dark mode toggle to user preferences panel",
		priority: "low",
		labels: [
			{ text: "Frontend", color: "blue" },
			{ text: "UX", color: "pink" },
		],
		subtasksDone: 1,
		subtasksTotal: 3,
		assigneeInitials: "SK",
		assigneeColor: "linear-gradient(135deg, #06B6D4, #3B82F6)",
	},
};

export const Urgent: Story = {
	args: {
		id: "AIO-18",
		title: "Fix critical auth bypass in sandbox API endpoint",
		priority: "urgent",
		labels: [
			{ text: "Bug", color: "red" },
			{ text: "Backend", color: "purple" },
		],
		subtasksDone: 0,
		subtasksTotal: 2,
		assigneeInitials: "MP",
		assigneeColor: "linear-gradient(135deg, #F97316, #EF4444)",
	},
};

export const HighPriority: Story = {
	args: {
		id: "AIO-27",
		title: "Implement agent orchestration pipeline for Mistral Vibe",
		priority: "high",
		labels: [
			{ text: "Agent", color: "orange" },
			{ text: "Backend", color: "purple" },
		],
		subtasksDone: 3,
		subtasksTotal: 5,
		assigneeInitials: "JL",
		assigneeColor: "linear-gradient(135deg, #6366F1, #8B5CF6)",
	},
};

export const CompletedSubtasks: Story = {
	args: {
		id: "AIO-33",
		title: "Set up CI pipeline with type checking",
		priority: "medium",
		labels: [{ text: "Infra", color: "yellow" }],
		subtasksDone: 4,
		subtasksTotal: 4,
		assigneeInitials: "AY",
		assigneeColor: "linear-gradient(135deg, #EC4899, #F43F5E)",
	},
};

export const NoLabels: Story = {
	args: {
		id: "AIO-55",
		title: "Research WebSocket reconnection strategies for Convex",
		priority: "medium",
	},
};

export const Minimal: Story = {
	args: {
		id: "AIO-99",
		title: "Update README with setup instructions",
		priority: "none",
	},
};
