import type { Meta, StoryObj } from "@storybook/react-vite";
import type { KanbanItemProps } from "./KanbanItem.component";
import { KanbanColumn } from "./KanbanColumn.component";

const meta = {
	title: "managed/KanbanColumn",
	component: KanbanColumn,
	argTypes: {
		onAddItem: { action: "addItem" },
		onItemClick: { action: "itemClick" },
	},
	decorators: [
		(Story) => (
			<div className="bg-background p-6">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof KanbanColumn>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleItems: KanbanItemProps[] = [
	{
		id: "AIO-12",
		title: "Set up Convex schema for agent state persistence",
		priority: "high",
		labels: [
			{ text: "Backend", color: "purple" },
			{ text: "Agent", color: "orange" },
		],
		subtasksDone: 2,
		subtasksTotal: 5,
		assigneeInitials: "SK",
		assigneeColor: "linear-gradient(135deg, #06B6D4, #3B82F6)",
	},
	{
		id: "AIO-13",
		title: "Implement pixel-art sprite animation loop",
		priority: "medium",
		labels: [{ text: "Frontend", color: "blue" }],
		subtasksDone: 1,
		subtasksTotal: 3,
		assigneeInitials: "JL",
		assigneeColor: "linear-gradient(135deg, #6366F1, #8B5CF6)",
	},
	{
		id: "AIO-14",
		title: "Add WebSocket reconnection with exponential backoff",
		priority: "low",
		labels: [{ text: "Infra", color: "yellow" }],
	},
	{
		id: "AIO-15",
		title: "Fix critical auth bypass in sandbox API endpoint",
		priority: "urgent",
		labels: [
			{ text: "Bug", color: "red" },
			{ text: "Security", color: "pink" },
		],
		subtasksDone: 0,
		subtasksTotal: 2,
		assigneeInitials: "MP",
		assigneeColor: "linear-gradient(135deg, #F97316, #EF4444)",
	},
];

export const WithItems: Story = {
	args: {
		title: "In Progress",
		status: "in-progress",
		items: sampleItems,
		accentColor: "blue-500",
	},
};

export const Empty: Story = {
	args: {
		title: "To Do",
		status: "todo",
		items: [],
		accentColor: "orange-500",
	},
};

const manyItems: KanbanItemProps[] = Array.from({ length: 15 }, (_, i) => ({
	id: `AIO-${100 + i}`,
	title: `Task number ${i + 1} — ${
		[
			"Update dependency versions",
			"Write integration tests",
			"Review PR feedback",
			"Refactor auth module",
			"Add error boundaries",
			"Set up monitoring alerts",
			"Optimize bundle size",
			"Implement caching layer",
			"Fix flaky test suite",
			"Document API endpoints",
			"Add rate limiting middleware",
			"Migrate database schema",
			"Create onboarding flow",
			"Build notification system",
			"Add accessibility labels",
		][i]
	}`,
	priority: (["urgent", "high", "medium", "low", "none"] as const)[i % 5],
	labels: [
		{
			text: ["Frontend", "Backend", "Infra", "Agent", "DevOps"][i % 5],
			color: (["blue", "purple", "yellow", "orange", "cyan"] as const)[i % 5],
		},
	],
}));

export const ManyItems: Story = {
	args: {
		title: "Backlog",
		status: "backlog",
		items: manyItems,
		accentColor: "purple-500",
	},
};

const todoItems: KanbanItemProps[] = [
	{
		id: "AIO-20",
		title: "Design pixel-art character sprites for agent avatars",
		priority: "medium",
		labels: [{ text: "Design", color: "pink" }],
		assigneeInitials: "AY",
		assigneeColor: "linear-gradient(135deg, #EC4899, #F43F5E)",
	},
	{
		id: "AIO-21",
		title: "Write unit tests for Convex mutations",
		priority: "low",
		labels: [{ text: "Testing", color: "green" }],
	},
	{
		id: "AIO-22",
		title: "Add keyboard shortcuts for board navigation",
		priority: "low",
		labels: [{ text: "UX", color: "cyan" }],
	},
];

const inProgressItems: KanbanItemProps[] = [
	{
		id: "AIO-10",
		title: "Implement manager agent orchestration with Mistral",
		priority: "urgent",
		labels: [
			{ text: "Agent", color: "orange" },
			{ text: "Backend", color: "purple" },
		],
		subtasksDone: 3,
		subtasksTotal: 7,
		assigneeInitials: "SK",
		assigneeColor: "linear-gradient(135deg, #06B6D4, #3B82F6)",
	},
	{
		id: "AIO-11",
		title: "Build real-time Convex subscription hooks",
		priority: "high",
		labels: [{ text: "Frontend", color: "blue" }],
		subtasksDone: 1,
		subtasksTotal: 4,
		assigneeInitials: "JL",
		assigneeColor: "linear-gradient(135deg, #6366F1, #8B5CF6)",
	},
];

const doneItems: KanbanItemProps[] = [
	{
		id: "AIO-01",
		title: "Set up monorepo with bun workspaces",
		priority: "none",
		labels: [{ text: "Infra", color: "yellow" }],
		subtasksDone: 3,
		subtasksTotal: 3,
		assigneeInitials: "SK",
		assigneeColor: "linear-gradient(135deg, #06B6D4, #3B82F6)",
	},
	{
		id: "AIO-02",
		title: "Configure Convex backend with auth",
		priority: "none",
		labels: [{ text: "Backend", color: "purple" }],
		subtasksDone: 5,
		subtasksTotal: 5,
		assigneeInitials: "MP",
		assigneeColor: "linear-gradient(135deg, #F97316, #EF4444)",
	},
	{
		id: "AIO-03",
		title: "Create base pixel-art design tokens",
		priority: "none",
		labels: [{ text: "Design", color: "pink" }],
		subtasksDone: 2,
		subtasksTotal: 2,
	},
	{
		id: "AIO-04",
		title: "Implement TanStack Router with file-based routes",
		priority: "none",
		labels: [{ text: "Frontend", color: "blue" }],
		subtasksDone: 4,
		subtasksTotal: 4,
		assigneeInitials: "JL",
		assigneeColor: "linear-gradient(135deg, #6366F1, #8B5CF6)",
	},
	{
		id: "AIO-05",
		title: "Add environment variable validation with t3-env",
		priority: "none",
		labels: [{ text: "Infra", color: "yellow" }],
		subtasksDone: 1,
		subtasksTotal: 1,
	},
];

export const ThreeColumns: Story = {
	args: {
		title: "To Do",
		status: "todo",
		items: todoItems,
		accentColor: "orange-500",
		onAddItem: () => {},
		onItemClick: () => {},
	},
	render: (args) => (
		<div className="flex gap-4">
			<KanbanColumn {...args} />
			<KanbanColumn
				title="In Progress"
				status="in-progress"
				items={inProgressItems}
				accentColor="blue-500"
				onAddItem={args.onAddItem}
				onItemClick={args.onItemClick}
			/>
			<KanbanColumn
				title="Done"
				status="done"
				items={doneItems}
				accentColor="green-500"
				onAddItem={args.onAddItem}
				onItemClick={args.onItemClick}
			/>
		</div>
	),
};
