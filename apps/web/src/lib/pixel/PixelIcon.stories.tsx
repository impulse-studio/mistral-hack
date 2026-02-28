import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "./PixelIcon";

/**
 * A simple 16x16 pixel-art star SVG used across stories.
 * Each rect represents a "pixel" at integer coordinates.
 */
function StarIcon() {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
			{/* Top point */}
			<rect x="7" y="0" width="2" height="2" />
			{/* Upper arms */}
			<rect x="6" y="2" width="4" height="2" />
			<rect x="2" y="4" width="12" height="2" />
			<rect x="0" y="6" width="16" height="2" />
			{/* Center */}
			<rect x="2" y="8" width="12" height="2" />
			{/* Lower arms */}
			<rect x="3" y="10" width="4" height="2" />
			<rect x="9" y="10" width="4" height="2" />
			{/* Bottom points */}
			<rect x="2" y="12" width="2" height="2" />
			<rect x="12" y="12" width="2" height="2" />
			<rect x="1" y="14" width="2" height="2" />
			<rect x="13" y="14" width="2" height="2" />
		</svg>
	);
}

const meta = {
	title: "primitives/PixelIcon",
	component: PixelIcon,
	argTypes: {
		size: {
			control: "select",
			options: ["sm", "md", "lg", "xl"],
		},
		color: {
			control: "color",
		},
		label: {
			control: "text",
		},
	},
	decorators: [
		(Story) => (
			<div className="flex items-center gap-4 bg-background p-6">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof PixelIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SvgIcon: Story = {
	args: {
		size: "lg",
		label: "Star icon",
	},
	render: (args) => (
		<PixelIcon {...args}>
			<StarIcon />
		</PixelIcon>
	),
};

export const AllSizes: Story = {
	render: () => (
		<div className="flex items-end gap-6">
			{(["sm", "md", "lg", "xl"] as const).map((size) => (
				<div key={size} className="flex flex-col items-center gap-2">
					<PixelIcon size={size} label={`Star ${size}`}>
						<StarIcon />
					</PixelIcon>
					<span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
						{size}
					</span>
				</div>
			))}
		</div>
	),
};

export const Colored: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			{[
				{ color: "#F97316", name: "orange" },
				{ color: "#06B6D4", name: "cyan" },
				{ color: "#22C55E", name: "green" },
				{ color: "#EF4444", name: "red" },
			].map(({ color, name }) => (
				<div key={name} className="flex flex-col items-center gap-2">
					<PixelIcon size="lg" color={color} label={`Star ${name}`}>
						<StarIcon />
					</PixelIcon>
					<span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
						{name}
					</span>
				</div>
			))}
		</div>
	),
};

export const SpriteSheet: Story = {
	args: {
		src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect x='8' y='8' width='8' height='8' fill='%23F97316'/%3E%3Crect x='16' y='8' width='8' height='8' fill='%23F97316'/%3E%3Crect x='24' y='8' width='8' height='8' fill='%23F97316'/%3E%3Crect x='8' y='16' width='8' height='8' fill='%23F97316'/%3E%3Crect x='16' y='16' width='8' height='8' fill='%23FBBF24'/%3E%3Crect x='24' y='16' width='8' height='8' fill='%23F97316'/%3E%3Crect x='8' y='24' width='8' height='8' fill='%23F97316'/%3E%3Crect x='16' y='24' width='8' height='8' fill='%23F97316'/%3E%3Crect x='24' y='24' width='8' height='8' fill='%23F97316'/%3E%3C/svg%3E",
		spriteX: 0,
		spriteY: 0,
		size: "xl",
		label: "Sprite demo",
	},
};

export const InlineWithText: Story = {
	render: () => (
		<div className="flex items-center gap-2">
			<PixelIcon size="sm" color="#F97316" label="Status">
				<StarIcon />
			</PixelIcon>
			<span className="inline-flex items-center border-2 border-orange-500 bg-orange-500/10 px-1.5 py-px font-mono text-[10px] font-semibold uppercase tracking-widest text-orange-500">
				Active
			</span>
			<span className="text-xs font-medium text-foreground">Agent is processing task AIO-42</span>
		</div>
	),
};
