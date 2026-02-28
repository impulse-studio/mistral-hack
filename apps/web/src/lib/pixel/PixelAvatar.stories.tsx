import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelAvatar } from "./PixelAvatar";

const meta = {
	title: "primitives/PixelAvatar",
	component: PixelAvatar,
	argTypes: {
		size: {
			control: "select",
			options: ["xs", "sm", "md", "lg"],
		},
		status: {
			control: "select",
			options: [undefined, "idle", "active", "error"],
		},
		color: { control: "text" },
		initials: { control: "text" },
		src: { control: "text" },
	},
} satisfies Meta<typeof PixelAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = {
	args: {
		initials: "SK",
	},
};

export const CustomGradient: Story = {
	args: {
		initials: "MP",
		color: "linear-gradient(135deg, #F97316, #EF4444)",
	},
};

export const AllSizes: Story = {
	render: () => (
		<div className="flex items-end gap-3">
			<PixelAvatar size="xs" initials="XS" />
			<PixelAvatar size="sm" initials="SM" />
			<PixelAvatar size="md" initials="MD" />
			<PixelAvatar size="lg" initials="LG" />
		</div>
	),
};

export const WithStatus: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<PixelAvatar initials="ID" size="md" status="idle" />
			<PixelAvatar
				initials="AC"
				size="md"
				status="active"
				color="linear-gradient(135deg, #22C55E, #16A34A)"
			/>
			<PixelAvatar
				initials="ER"
				size="md"
				status="error"
				color="linear-gradient(135deg, #EF4444, #DC2626)"
			/>
		</div>
	),
};

export const Image: Story = {
	args: {
		src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAARklEQVQ4T2P8z8BQz0BAwMDAwMDIQCRgYGBg+M/AUM/AwFDPMGoAXkdQ7AJkLyCahugGYPMCsiZkNQyjYTC4w4CY7MxIahgAL1sUEXoaczkAAAAASUVORK5CYII=",
		size: "lg",
		initials: "PX",
	},
};

export const Group: Story = {
	render: () => (
		<div className="flex items-center">
			<PixelAvatar initials="SK" size="md" color="linear-gradient(135deg, #06B6D4, #3B82F6)" />
			<PixelAvatar
				initials="MP"
				size="md"
				color="linear-gradient(135deg, #F97316, #EF4444)"
				className="-ml-2"
			/>
			<PixelAvatar
				initials="JL"
				size="md"
				color="linear-gradient(135deg, #6366F1, #8B5CF6)"
				className="-ml-2"
			/>
			<PixelAvatar
				initials="AY"
				size="md"
				color="linear-gradient(135deg, #EC4899, #F43F5E)"
				className="-ml-2"
			/>
		</div>
	),
};
