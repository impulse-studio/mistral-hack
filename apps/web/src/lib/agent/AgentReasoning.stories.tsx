import type { Meta, StoryObj } from "@storybook/react-vite";

import { AgentReasoning } from "./AgentReasoning.component";

const meta = {
	title: "managed/AgentReasoning",
	component: AgentReasoning,
	decorators: [
		(Story) => (
			<div className="bg-background p-6" style={{ maxWidth: 420 }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof AgentReasoning>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InProgress: Story = {
	args: {
		steps: [
			{
				id: "step-1",
				title: "Parse task requirements",
				detail: "Extracted 3 acceptance criteria from the task description.",
				status: "completed",
				duration: 1200,
			},
			{
				id: "step-2",
				title: "Identify affected files",
				detail: "Found 5 files that need modification based on the dependency graph.",
				status: "completed",
				duration: 800,
			},
			{
				id: "step-3",
				title: "Generate implementation plan",
				detail: "Creating a step-by-step plan for code changes.",
				status: "active",
			},
			{
				id: "step-4",
				title: "Write code changes",
				status: "pending",
			},
			{
				id: "step-5",
				title: "Run tests and validate",
				status: "pending",
			},
		],
	},
};

export const AllComplete: Story = {
	args: {
		steps: [
			{
				id: "step-1",
				title: "Analyze codebase structure",
				detail: "Scanned 142 files across 12 modules.",
				status: "completed",
				duration: 2100,
			},
			{
				id: "step-2",
				title: "Plan API endpoints",
				detail: "Designed 4 REST endpoints for the auth module.",
				status: "completed",
				duration: 1500,
			},
			{
				id: "step-3",
				title: "Implement handlers",
				detail: "Created login, register, refresh, and logout handlers.",
				status: "completed",
				duration: 4200,
			},
			{
				id: "step-4",
				title: "Write unit tests",
				detail: "Added 18 test cases covering all edge cases.",
				status: "completed",
				duration: 3100,
			},
			{
				id: "step-5",
				title: "Verify build passes",
				detail: "All checks green — zero TypeScript errors, 18/18 tests pass.",
				status: "completed",
				duration: 900,
			},
		],
		title: "Completed Reasoning",
	},
};

export const Error: Story = {
	args: {
		steps: [
			{
				id: "step-1",
				title: "Parse task requirements",
				status: "completed",
				duration: 1100,
			},
			{
				id: "step-2",
				title: "Identify affected files",
				status: "completed",
				duration: 750,
			},
			{
				id: "step-3",
				title: "Generate implementation plan",
				detail: "Failed to resolve dependency conflict between packages.",
				status: "error",
			},
			{
				id: "step-4",
				title: "Write code changes",
				status: "pending",
			},
			{
				id: "step-5",
				title: "Run tests and validate",
				status: "pending",
			},
		],
	},
};

export const Collapsed: Story = {
	args: {
		collapsed: true,
		steps: [
			{
				id: "step-1",
				title: "Parse task requirements",
				status: "completed",
				duration: 1200,
			},
			{
				id: "step-2",
				title: "Identify affected files",
				status: "active",
			},
			{
				id: "step-3",
				title: "Generate plan",
				status: "pending",
			},
		],
	},
};

export const SingleStep: Story = {
	args: {
		steps: [
			{
				id: "step-1",
				title: "Analyzing the repository structure",
				detail: "Scanning files and building dependency graph for the monorepo.",
				status: "active",
			},
		],
	},
};

export const ManySteps: Story = {
	args: {
		title: "Extended Reasoning",
		steps: [
			{
				id: "step-1",
				title: "Parse requirements",
				status: "completed",
				duration: 500,
			},
			{
				id: "step-2",
				title: "Analyze dependencies",
				status: "completed",
				duration: 800,
			},
			{
				id: "step-3",
				title: "Design schema",
				status: "completed",
				duration: 1200,
			},
			{
				id: "step-4",
				title: "Generate migrations",
				status: "completed",
				duration: 600,
			},
			{
				id: "step-5",
				title: "Implement resolvers",
				status: "completed",
				duration: 3400,
			},
			{
				id: "step-6",
				title: "Write integration tests",
				status: "completed",
				duration: 2800,
			},
			{
				id: "step-7",
				title: "Update documentation",
				status: "active",
			},
			{
				id: "step-8",
				title: "Final review",
				status: "pending",
			},
		],
	},
};
