import type { Meta, StoryObj } from "@storybook/react-vite";

import { ManagerSandboxStatus } from "./ManagerSandboxStatus.component.tsx";

const meta = {
	title: "managed/ManagerSandboxStatus",
	component: ManagerSandboxStatus,
	argTypes: {
		status: {
			control: "select",
			options: ["running", "stopped", "error", "provisioning", "connecting"],
		},
		variant: {
			control: "select",
			options: ["compact", "expanded"],
		},
		uptime: { control: "text" },
		region: { control: "text" },
		cpu: { control: { type: "range", min: 0, max: 100, step: 1 } },
		memory: { control: { type: "range", min: 0, max: 100, step: 1 } },
	},
	decorators: [
		(Story) => (
			<div className="w-[280px] bg-background p-6">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ManagerSandboxStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Running: Story = {
	args: {
		status: "running",
		variant: "compact",
		uptime: "2h 14m",
		region: "us-east-1",
		cpu: 42,
		memory: 58,
	},
};

export const Stopped: Story = {
	args: {
		status: "stopped",
		variant: "compact",
	},
};

export const Error: Story = {
	args: {
		status: "error",
		variant: "compact",
	},
};

export const Provisioning: Story = {
	args: {
		status: "provisioning",
		variant: "compact",
	},
};

export const Expanded: Story = {
	args: {
		status: "running",
		variant: "expanded",
		uptime: "2h 14m",
		region: "us-east-1",
		cpu: 42,
		memory: 58,
	},
};

export const HighUsage: Story = {
	args: {
		status: "running",
		variant: "expanded",
		uptime: "6h 02m",
		region: "eu-west-1",
		cpu: 90,
		memory: 85,
	},
};
