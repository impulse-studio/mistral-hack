import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelGlow } from "./PixelGlow";

const meta = {
	title: "primitives/PixelGlow",
	component: PixelGlow,
	argTypes: {
		color: {
			control: "select",
			options: ["green", "orange", "red", "cyan", "yellow", "muted"],
		},
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
		pulse: {
			control: "boolean",
		},
		label: {
			control: "text",
		},
	},
} satisfies Meta<typeof PixelGlow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		color: "green",
		size: "md",
	},
};

export const AllColors: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<PixelGlow color="green" />
			<PixelGlow color="orange" />
			<PixelGlow color="red" />
			<PixelGlow color="cyan" />
			<PixelGlow color="yellow" />
			<PixelGlow color="muted" />
		</div>
	),
};

export const WithLabel: Story = {
	render: () => (
		<div className="flex flex-col gap-3">
			<PixelGlow color="green" label="Running" />
			<PixelGlow color="orange" label="Processing" />
			<PixelGlow color="red" label="Error" />
			<PixelGlow color="cyan" label="Connected" />
			<PixelGlow color="yellow" label="Pending" />
			<PixelGlow color="muted" label="Offline" />
		</div>
	),
};

export const Pulsing: Story = {
	render: () => (
		<div className="flex flex-col gap-3">
			<PixelGlow color="green" pulse label="Active" />
			<PixelGlow color="orange" pulse label="Processing" />
			<PixelGlow color="cyan" pulse label="Syncing" />
			<PixelGlow color="yellow" pulse label="Thinking" />
		</div>
	),
};

export const Sizes: Story = {
	render: () => (
		<div className="flex items-center gap-6">
			<PixelGlow color="green" size="sm" label="Small" />
			<PixelGlow color="green" size="md" label="Medium" />
			<PixelGlow color="green" size="lg" label="Large" />
		</div>
	),
};

export const InDarkCard: Story = {
	render: () => (
		<div className="border-2 border-border bg-card p-4 shadow-pixel inset-shadow-pixel">
			<div className="mb-3 font-mono text-xs font-semibold uppercase tracking-widest text-foreground">
				Sandbox Status
			</div>
			<div className="flex flex-col gap-2.5">
				<PixelGlow color="green" label="Container" />
				<PixelGlow color="cyan" label="Network" />
				<PixelGlow color="orange" pulse label="Agent #1" />
				<PixelGlow color="yellow" pulse label="Agent #2" />
				<PixelGlow color="red" label="Agent #3" />
				<PixelGlow color="muted" label="Agent #4" />
			</div>
		</div>
	),
	decorators: [
		(Story) => (
			<div className="w-[260px] bg-background p-6">
				<Story />
			</div>
		),
	],
};
