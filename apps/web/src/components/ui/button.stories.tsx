import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";

const meta = {
	title: "ui/Button",
	component: Button,
	argTypes: {
		variant: {
			control: "select",
			options: [
				"default",
				"elevated",
				"accent",
				"outline",
				"dashed",
				"ghost",
				"link",
				"destructive",
			],
		},
		size: {
			control: "select",
			options: ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"],
		},
	},
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { children: "Button" },
};

export const Elevated: Story = {
	args: { children: "Elevated", variant: "elevated" },
};

export const Accent: Story = {
	args: { children: "Enter Office", variant: "accent" },
};

export const Outline: Story = {
	args: { children: "Outline", variant: "outline" },
};

export const Dashed: Story = {
	args: { children: "Add Column", variant: "dashed" },
};

export const Ghost: Story = {
	args: { children: "Ghost", variant: "ghost" },
};

export const LinkVariant: Story = {
	args: { children: "View Details", variant: "link" },
};

export const Destructive: Story = {
	args: { children: "Delete", variant: "destructive" },
};

export const Small: Story = {
	args: { children: "Small", size: "sm" },
};

export const Large: Story = {
	args: { children: "Large", size: "lg" },
};

export const IconButton: Story = {
	args: { children: "×", size: "icon" },
};
