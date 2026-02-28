import type { Meta, StoryObj } from "@storybook/react-vite";

import { PixelDivider } from "./PixelDivider";

const meta = {
	title: "primitives/PixelDivider",
	component: PixelDivider,
	argTypes: {
		orientation: {
			control: "select",
			options: ["horizontal", "vertical"],
		},
		variant: {
			control: "select",
			options: ["solid", "dashed", "dotted"],
		},
		label: {
			control: "text",
		},
	},
	decorators: [
		(Story) => (
			<div className="w-[320px] bg-background p-4">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof PixelDivider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Solid: Story = {
	args: {},
};

export const Dashed: Story = {
	args: {
		variant: "dashed",
	},
};

export const Dotted: Story = {
	args: {
		variant: "dotted",
	},
};

export const WithLabel: Story = {
	args: {
		label: "or",
	},
};

export const Vertical: Story = {
	args: {
		orientation: "vertical",
	},
	decorators: [
		(Story) => (
			<div className="flex h-24 w-[320px] items-center gap-4 bg-background p-4">
				<span className="text-xs text-foreground">Left</span>
				<Story />
				<span className="text-xs text-foreground">Right</span>
			</div>
		),
	],
};

export const InCard: Story = {
	args: {},
	decorators: [
		(Story) => (
			<div className="w-[320px] border-2 border-border bg-card p-4 shadow-pixel inset-shadow-pixel">
				<p className="mb-3 text-xs font-medium leading-relaxed text-foreground">
					Agent has finished analyzing the codebase and identified 3 potential improvements.
				</p>
				<Story />
				<p className="mt-3 text-xs font-medium leading-relaxed text-muted-foreground">
					Click to view detailed report with suggested refactors.
				</p>
			</div>
		),
	],
};
