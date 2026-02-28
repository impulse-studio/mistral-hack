import type { Meta, StoryObj } from "@storybook/react-vite";

import { ManagerBar } from "./ManagerBar.component.tsx";

const meta = {
	title: "managed/ManagerBar",
	component: ManagerBar,
	decorators: [
		(Story) => (
			<div className="relative h-40">
				<Story />
			</div>
		),
	],
	args: {
		className: "absolute bottom-0 left-0 right-0",
	},
} satisfies Meta<typeof ManagerBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		onSubmitTask: (prompt: string) => console.log("submit:", prompt),
		sandboxStatus: "running",
		taskCount: { done: 3, total: 5 },
		agentCount: 4,
	},
};

export const Thinking: Story = {
	args: {
		onSubmitTask: (prompt: string) => console.log("submit:", prompt),
		isThinking: true,
		sandboxStatus: "running",
		taskCount: { done: 2, total: 5 },
		agentCount: 4,
	},
};

export const NoTasks: Story = {
	args: {
		onSubmitTask: (prompt: string) => console.log("submit:", prompt),
		sandboxStatus: "running",
		taskCount: { done: 0, total: 0 },
		agentCount: 2,
	},
};

export const SandboxError: Story = {
	args: {
		onSubmitTask: (prompt: string) => console.log("submit:", prompt),
		sandboxStatus: "error",
		taskCount: { done: 1, total: 3 },
		agentCount: 1,
	},
};

export const Provisioning: Story = {
	args: {
		onSubmitTask: (prompt: string) => console.log("submit:", prompt),
		sandboxStatus: "provisioning",
		taskCount: { done: 0, total: 0 },
		agentCount: 0,
	},
};
