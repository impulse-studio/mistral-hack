import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";

const meta = {
	title: "ui/Button",
	component: Button,
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
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

export const Outline: Story = {
	args: { children: "Outline", variant: "outline" },
};

export const Secondary: Story = {
	args: { children: "Secondary", variant: "secondary" },
};

export const Ghost: Story = {
	args: { children: "Ghost", variant: "ghost" },
};

export const Destructive: Story = {
	args: { children: "Delete", variant: "destructive" },
};

export const Link: Story = {
	args: { children: "Link", variant: "link" },
};

export const Small: Story = {
	args: { children: "Small", size: "sm" },
};

export const Large: Story = {
	args: { children: "Large", size: "lg" },
};
