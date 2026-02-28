import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";

const meta = {
	title: "ui/Card",
	component: Card,
	argTypes: {
		size: {
			control: "select",
			options: ["default", "sm"],
		},
	},
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		children: (
			<>
				<CardHeader>
					<CardTitle>Card Title</CardTitle>
					<CardDescription>Card description goes here.</CardDescription>
				</CardHeader>
				<CardContent>
					<p>Card content with some example text.</p>
				</CardContent>
			</>
		),
	},
};

export const WithFooter: Story = {
	args: {
		children: (
			<>
				<CardHeader>
					<CardTitle>Card Title</CardTitle>
					<CardDescription>Card with a footer action.</CardDescription>
				</CardHeader>
				<CardContent>
					<p>Some content here.</p>
				</CardContent>
				<CardFooter>
					<Button>Save</Button>
				</CardFooter>
			</>
		),
	},
};

export const WithAction: Story = {
	args: {
		children: (
			<>
				<CardHeader>
					<CardTitle>Card Title</CardTitle>
					<CardDescription>Card with a header action.</CardDescription>
					<CardAction>
						<Button variant="outline" size="sm">Edit</Button>
					</CardAction>
				</CardHeader>
				<CardContent>
					<p>Some content here.</p>
				</CardContent>
			</>
		),
	},
};

export const Small: Story = {
	args: {
		size: "sm",
		children: (
			<>
				<CardHeader>
					<CardTitle>Compact Card</CardTitle>
					<CardDescription>Smaller padding variant.</CardDescription>
				</CardHeader>
				<CardContent>
					<p>Compact content.</p>
				</CardContent>
			</>
		),
	},
};
