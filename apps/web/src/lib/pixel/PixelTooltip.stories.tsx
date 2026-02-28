import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelTooltip } from "./PixelTooltip";

const meta = {
	title: "primitives/PixelTooltip",
	component: PixelTooltip,
	argTypes: {
		side: {
			control: "select",
			options: ["top", "right", "bottom", "left"],
		},
		delayDuration: {
			control: "number",
		},
	},
	decorators: [
		(Story) => (
			<div className="flex min-h-[200px] items-center justify-center bg-background p-8">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof PixelTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		content: "Save changes",
		side: "top",
		children: (
			<button
				type="button"
				className="border-2 border-border bg-card px-3 py-1.5 font-mono text-xs shadow-pixel inset-shadow-pixel"
			>
				Hover me
			</button>
		),
	},
};

export const AllSides: Story = {
	args: {
		content: "Tooltip",
		children: <span>trigger</span>,
	},
	render: () => (
		<div className="grid grid-cols-3 gap-8">
			<div className="col-start-2 flex justify-center">
				<PixelTooltip content="Top tooltip" side="top">
					<button
						type="button"
						className="border-2 border-border bg-card px-3 py-1.5 font-mono text-xs shadow-pixel inset-shadow-pixel"
					>
						Top
					</button>
				</PixelTooltip>
			</div>
			<div className="flex justify-end">
				<PixelTooltip content="Left tooltip" side="left">
					<button
						type="button"
						className="border-2 border-border bg-card px-3 py-1.5 font-mono text-xs shadow-pixel inset-shadow-pixel"
					>
						Left
					</button>
				</PixelTooltip>
			</div>
			<div className="col-start-3 flex justify-start">
				<PixelTooltip content="Right tooltip" side="right">
					<button
						type="button"
						className="border-2 border-border bg-card px-3 py-1.5 font-mono text-xs shadow-pixel inset-shadow-pixel"
					>
						Right
					</button>
				</PixelTooltip>
			</div>
			<div className="col-start-2 flex justify-center">
				<PixelTooltip content="Bottom tooltip" side="bottom">
					<button
						type="button"
						className="border-2 border-border bg-card px-3 py-1.5 font-mono text-xs shadow-pixel inset-shadow-pixel"
					>
						Bottom
					</button>
				</PixelTooltip>
			</div>
		</div>
	),
};

export const RichContent: Story = {
	args: {
		content: (
			<div className="flex items-center gap-1.5">
				<span className="inline-flex items-center border border-green-500 bg-green-500/10 px-1 py-px font-mono text-[10px] font-semibold uppercase tracking-widest text-green-500">
					Online
				</span>
				<span>Agent is active</span>
			</div>
		),
		side: "top",
		children: (
			<button
				type="button"
				className="border-2 border-border bg-card px-3 py-1.5 font-mono text-xs shadow-pixel inset-shadow-pixel"
			>
				Status
			</button>
		),
	},
};

export const LongText: Story = {
	args: {
		content: (
			<span className="max-w-xs">
				This agent is currently processing a multi-step task involving code review, testing, and
				deployment to the staging environment.
			</span>
		),
		side: "bottom",
		children: (
			<button
				type="button"
				className="border-2 border-border bg-card px-3 py-1.5 font-mono text-xs shadow-pixel inset-shadow-pixel"
			>
				Details
			</button>
		),
	},
};
