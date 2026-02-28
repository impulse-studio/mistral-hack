import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { PixelProgress } from "./PixelProgress";

const meta = {
	title: "primitives/PixelProgress",
	component: PixelProgress,
	argTypes: {
		color: {
			control: "select",
			options: ["green", "orange", "red", "cyan", "muted"],
		},
		size: {
			control: "select",
			options: ["sm", "md"],
		},
		showLabel: {
			control: "boolean",
		},
		segments: {
			control: { type: "range", min: 2, max: 16, step: 1 },
		},
		value: {
			control: { type: "range", min: 0, max: 100, step: 1 },
		},
		max: {
			control: { type: "number" },
		},
	},
	decorators: [
		(Story) => (
			<div className="w-[280px] bg-background p-4">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof PixelProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
	args: {
		value: 0,
		segments: 8,
	},
};

export const Partial: Story = {
	args: {
		value: 3,
		max: 8,
	},
};

export const Complete: Story = {
	args: {
		value: 8,
		max: 8,
	},
};

export const WithLabel: Story = {
	args: {
		value: 3,
		max: 5,
		showLabel: true,
	},
};

export const AllColors: Story = {
	args: {
		value: 60,
		segments: 10,
	},
	render: () => (
		<div className="flex flex-col gap-3">
			{(["green", "orange", "red", "cyan", "muted"] as const).map((color) => (
				<div key={color} className="flex items-center gap-2">
					<span className="w-12 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
						{color}
					</span>
					<PixelProgress value={60} color={color} segments={10} className="flex-1" />
				</div>
			))}
		</div>
	),
};

export const Sizes: Story = {
	args: {
		value: 5,
		max: 8,
	},
	render: () => (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-2">
				<span className="w-8 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
					sm
				</span>
				<PixelProgress value={5} max={8} size="sm" showLabel className="flex-1" />
			</div>
			<div className="flex items-center gap-2">
				<span className="w-8 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
					md
				</span>
				<PixelProgress value={5} max={8} size="md" showLabel className="flex-1" />
			</div>
		</div>
	),
};

export const Animating: Story = {
	args: {
		value: 0,
		max: 10,
		segments: 10,
		color: "cyan",
		showLabel: true,
	},
	render: function AnimatingStory() {
		const [value, setValue] = useState(0);
		const max = 10;

		useEffect(() => {
			const interval = setInterval(() => {
				setValue((prev) => (prev >= max ? 0 : prev + 1));
			}, 500);
			return () => clearInterval(interval);
		}, []);

		return <PixelProgress value={value} max={max} segments={max} color="cyan" showLabel />;
	},
};
