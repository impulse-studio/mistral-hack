import type { Meta, StoryObj } from "@storybook/react-vite";

import { AgentCard } from "./AgentCard.component";

const meta = {
	title: "managed/AgentCard",
	component: AgentCard,
	decorators: [
		(Story) => (
			<div className="bg-background p-6" style={{ maxWidth: 340 }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof AgentCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		id: "agent-001",
		name: "Scout",
		role: "Frontend",
		roleColor: "blue",
		status: "idle",
		avatarInitials: "SC",
		avatarColor: "#3b82f6",
	},
};

export const Coding: Story = {
	args: {
		id: "agent-002",
		name: "Vibe",
		role: "Backend",
		roleColor: "purple",
		status: "coding",
		currentTask:
			"Implementing authentication middleware with JWT token validation and refresh logic",
		avatarInitials: "VB",
		avatarColor: "#8b5cf6",
		onClick: () => console.log("clicked Vibe"),
	},
};

export const Thinking: Story = {
	args: {
		id: "agent-003",
		name: "Planner",
		role: "Architect",
		roleColor: "yellow",
		status: "thinking",
		avatarInitials: "PL",
		avatarColor: "#eab308",
	},
};

export const Error: Story = {
	args: {
		id: "agent-004",
		name: "Builder",
		role: "DevOps",
		roleColor: "red",
		status: "error",
		currentTask: "Failed to provision sandbox environment",
		avatarInitials: "BL",
		avatarColor: "#ef4444",
	},
};

export const Done: Story = {
	args: {
		id: "agent-005",
		name: "Tester",
		role: "QA",
		roleColor: "green",
		status: "done",
		currentTask: "All 42 test cases passed successfully",
		avatarInitials: "TS",
		avatarColor: "#22c55e",
	},
};

export const Grid: Story = {
	args: {
		id: "grid",
		name: "Grid",
		role: "Demo",
		status: "idle",
		avatarInitials: "GR",
	},
	render: () => (
		<div className="grid grid-cols-2 gap-4">
			<AgentCard
				id="agent-001"
				name="Scout"
				role="Frontend"
				roleColor="blue"
				status="coding"
				currentTask="Building pixel-art component library"
				avatarInitials="SC"
				avatarColor="#3b82f6"
				onClick={() => console.log("clicked Scout")}
			/>
			<AgentCard
				id="agent-002"
				name="Vibe"
				role="Backend"
				roleColor="purple"
				status="thinking"
				avatarInitials="VB"
				avatarColor="#8b5cf6"
			/>
			<AgentCard
				id="agent-003"
				name="Builder"
				role="DevOps"
				roleColor="orange"
				status="error"
				currentTask="Docker build failed"
				avatarInitials="BL"
				avatarColor="#f97316"
			/>
			<AgentCard
				id="agent-004"
				name="Tester"
				role="QA"
				roleColor="green"
				status="done"
				avatarInitials="TS"
				avatarColor="#22c55e"
			/>
		</div>
	),
};
