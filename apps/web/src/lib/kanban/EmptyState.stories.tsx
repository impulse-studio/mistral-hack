import type { Meta, StoryObj } from "@storybook/react-vite";
import { KanbanEmptyState } from "./EmptyState.component";

const meta = {
	title: "kanban/KanbanEmptyState",
	component: KanbanEmptyState,
	argTypes: {
		variant: {
			control: "select",
			options: ["board", "column"],
		},
		onAction: { action: "action" },
		onSecondaryAction: { action: "secondaryAction" },
	},
} satisfies Meta<typeof KanbanEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Board: Story = {
	args: {
		variant: "board",
		icon: (
			<svg viewBox="0 0 80 80" fill="none" className="size-full text-muted-foreground">
				<rect
					x="8"
					y="16"
					width="18"
					height="48"
					rx="2"
					stroke="currentColor"
					strokeWidth="1.5"
					opacity="0.4"
				/>
				<rect
					x="31"
					y="16"
					width="18"
					height="36"
					rx="2"
					stroke="currentColor"
					strokeWidth="1.5"
					opacity="0.3"
				/>
				<rect
					x="54"
					y="16"
					width="18"
					height="24"
					rx="2"
					stroke="currentColor"
					strokeWidth="1.5"
					opacity="0.2"
				/>
			</svg>
		),
		title: "No tasks yet",
		description: "Your board is empty. Create your first task to get started with the project.",
		actionLabel: "Create first task",
		secondaryLabel: "or import from template",
	},
	decorators: [
		(Story) => (
			<div className="w-[720px] bg-background p-6">
				<Story />
			</div>
		),
	],
};

export const Column: Story = {
	args: {
		variant: "column",
		title: "No tasks",
		description: "Drag tasks here or create a new one",
		actionLabel: "+ Add task",
	},
	decorators: [
		(Story) => (
			<div className="w-[280px] bg-background p-4">
				<Story />
			</div>
		),
	],
};

export const BoardMinimal: Story = {
	args: {
		variant: "board",
		title: "Nothing here yet",
		description: "Get started by creating your first task.",
	},
	decorators: [
		(Story) => (
			<div className="w-[720px] bg-background p-6">
				<Story />
			</div>
		),
	],
};

export const ColumnMinimal: Story = {
	args: {
		variant: "column",
		title: "Empty",
	},
	decorators: [
		(Story) => (
			<div className="w-[280px] bg-background p-4">
				<Story />
			</div>
		),
	],
};
