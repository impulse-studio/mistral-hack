import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelBadge } from "./PixelBadge";

const COLORS = [
	"blue",
	"purple",
	"red",
	"green",
	"yellow",
	"orange",
	"pink",
	"cyan",
	"muted",
] as const;

const meta = {
	title: "primitives/PixelBadge",
	component: PixelBadge,
	argTypes: {
		color: {
			control: "select",
			options: [...COLORS],
		},
		variant: {
			control: "select",
			options: ["outline", "solid"],
		},
		size: {
			control: "select",
			options: ["sm", "md"],
		},
	},
	decorators: [
		(Story) => (
			<div className="bg-background p-6">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof PixelBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		children: "Badge",
		color: "blue",
		variant: "outline",
		size: "md",
	},
};

export const AllColors: Story = {
	args: { children: "Badge" },
	render: () => (
		<div className="flex flex-wrap gap-2">
			{COLORS.map((color) => (
				<PixelBadge key={color} color={color} variant="outline">
					{color}
				</PixelBadge>
			))}
		</div>
	),
};

export const Solid: Story = {
	args: { children: "Badge" },
	render: () => (
		<div className="flex flex-wrap gap-2">
			{COLORS.map((color) => (
				<PixelBadge key={color} color={color} variant="solid">
					{color}
				</PixelBadge>
			))}
		</div>
	),
};

export const Sizes: Story = {
	args: { children: "Badge" },
	render: () => (
		<div className="flex items-center gap-4">
			<div className="flex items-center gap-2">
				<span className="font-mono text-[10px] text-muted-foreground">sm:</span>
				<PixelBadge color="cyan" size="sm">
					Small
				</PixelBadge>
			</div>
			<div className="flex items-center gap-2">
				<span className="font-mono text-[10px] text-muted-foreground">md:</span>
				<PixelBadge color="cyan" size="md">
					Medium
				</PixelBadge>
			</div>
		</div>
	),
};

export const AgentStatus: Story = {
	args: { children: "Badge" },
	render: () => (
		<div className="flex flex-wrap gap-2">
			<PixelBadge color="green">Idle</PixelBadge>
			<PixelBadge color="cyan">Coding</PixelBadge>
			<PixelBadge color="yellow">Thinking</PixelBadge>
			<PixelBadge color="red">Error</PixelBadge>
		</div>
	),
};

export const InContext: Story = {
	args: { children: "Badge" },
	render: () => (
		<div className="border-2 border-border bg-card p-4 shadow-pixel inset-shadow-pixel">
			<div className="mb-2 flex items-center justify-between">
				<span className="font-mono text-[11px] font-medium text-muted-foreground">AIO-42</span>
			</div>
			<p className="mb-2 text-xs font-medium leading-relaxed text-foreground">
				Add dark mode toggle to user preferences panel
			</p>
			<div className="flex flex-wrap gap-1">
				<PixelBadge color="blue">Frontend</PixelBadge>
				<PixelBadge color="pink">UX</PixelBadge>
				<PixelBadge color="green">Done</PixelBadge>
			</div>
		</div>
	),
};
