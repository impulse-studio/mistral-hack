import type { Meta, StoryObj } from "@storybook/react-vite";

import { TetrisGame } from "./TetrisGame.component";

const meta = {
	title: "games/TetrisGame",
	component: TetrisGame,
	decorators: [
		(Story) => (
			<div className="flex min-h-[600px] items-center justify-center bg-background p-8">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof TetrisGame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DarkTheme: Story = {
	decorators: [
		(Story) => (
			<div className="dark flex min-h-[600px] items-center justify-center bg-background p-8">
				<Story />
			</div>
		),
	],
};
