import type { Meta, StoryObj } from "@storybook/react-vite";

import { PixelBorderBox } from "./PixelBorderBox.tsx";

const meta = {
	title: "primitives/PixelBorderBox",
	component: PixelBorderBox,
	argTypes: {
		variant: {
			control: "select",
			options: ["solid", "dashed", "none"],
		},
		elevation: {
			control: "select",
			options: ["flat", "raised", "floating"],
		},
		interactive: {
			control: "boolean",
		},
		as: {
			control: "select",
			options: ["div", "section", "aside", "article"],
		},
	},
} satisfies Meta<typeof PixelBorderBox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		children: (
			<div className="p-4">
				<p className="text-sm font-medium text-foreground">
					Default pixel border box — solid variant, raised elevation.
				</p>
			</div>
		),
	},
};

export const AllElevations: Story = {
	render: () => (
		<div className="flex gap-6 p-6">
			<PixelBorderBox elevation="flat" className="flex-1 p-4">
				<p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
					Flat
				</p>
				<p className="mt-1 text-xs text-foreground">No shadow</p>
			</PixelBorderBox>
			<PixelBorderBox elevation="raised" className="flex-1 p-4">
				<p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
					Raised
				</p>
				<p className="mt-1 text-xs text-foreground">shadow-pixel</p>
			</PixelBorderBox>
			<PixelBorderBox elevation="floating" className="flex-1 p-4">
				<p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
					Floating
				</p>
				<p className="mt-1 text-xs text-foreground">shadow-pixel-lg</p>
			</PixelBorderBox>
		</div>
	),
};

export const Dashed: Story = {
	args: {
		variant: "dashed",
		children: (
			<div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
				<p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
					Empty state
				</p>
				<p className="text-xs text-muted-foreground">Drop items here or click to add</p>
			</div>
		),
	},
};

export const Interactive: Story = {
	args: {
		interactive: true,
		children: (
			<div className="p-4">
				<p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
					Interactive
				</p>
				<p className="mt-1 text-xs text-foreground">Hover to lift, click to press</p>
			</div>
		),
	},
};

export const Nested: Story = {
	render: () => (
		<PixelBorderBox elevation="floating" className="p-4">
			<p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
				Outer container
			</p>
			<div className="flex gap-3">
				<PixelBorderBox className="flex-1 p-3">
					<p className="text-xs text-foreground">Nested card A</p>
				</PixelBorderBox>
				<PixelBorderBox className="flex-1 p-3">
					<p className="text-xs text-foreground">Nested card B</p>
				</PixelBorderBox>
			</div>
		</PixelBorderBox>
	),
};

export const AsSection: Story = {
	args: {
		as: "section",
		children: (
			<div className="p-4">
				<h2 className="font-mono text-sm font-semibold uppercase tracking-widest text-foreground">
					Section heading
				</h2>
				<p className="mt-2 text-xs leading-relaxed text-muted-foreground">
					Rendered as a semantic &lt;section&gt; element for accessibility.
				</p>
			</div>
		),
	},
};
