import type { Meta, StoryObj } from "@storybook/react-vite";

import { GamesSnakeGame as SnakeGame } from "./SnakeGame.component";

const meta = {
	title: "games/SnakeGame",
	component: SnakeGame,
	decorators: [
		(Story) => (
			<div className="flex min-h-[500px] items-center justify-center bg-background p-8">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof SnakeGame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DarkTheme: Story = {
	decorators: [
		(Story) => (
			<div className="dark flex min-h-[500px] items-center justify-center bg-background p-8">
				<Story />
			</div>
		),
	],
};
