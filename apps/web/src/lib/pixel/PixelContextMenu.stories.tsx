import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelContextMenu } from "./PixelContextMenu";

const meta = {
	title: "primitives/PixelContextMenu",
	component: PixelContextMenu,
	decorators: [
		(Story) => (
			<div className="flex min-h-[300px] items-center justify-center bg-background p-8">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof PixelContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		groups: [
			{
				items: [
					{ label: "Edit", onSelect: () => console.log("Edit") },
					{ label: "Duplicate", onSelect: () => console.log("Duplicate") },
					{
						label: "Delete",
						variant: "destructive",
						onSelect: () => console.log("Delete"),
					},
				],
			},
		],
		children: (
			<div className="flex h-32 w-48 items-center justify-center border-2 border-border bg-card font-mono text-xs shadow-pixel inset-shadow-pixel">
				Right-click me
			</div>
		),
	},
};

export const WithShortcuts: Story = {
	args: {
		groups: [
			{
				items: [
					{
						label: "Cut",
						shortcut: "Ctrl+X",
						onSelect: () => console.log("Cut"),
					},
					{
						label: "Copy",
						shortcut: "Ctrl+C",
						onSelect: () => console.log("Copy"),
					},
					{
						label: "Paste",
						shortcut: "Ctrl+V",
						onSelect: () => console.log("Paste"),
					},
				],
			},
		],
		children: (
			<div className="flex h-32 w-48 items-center justify-center border-2 border-border bg-card font-mono text-xs shadow-pixel inset-shadow-pixel">
				Right-click me
			</div>
		),
	},
};

export const Destructive: Story = {
	args: {
		groups: [
			{
				items: [
					{ label: "Edit", onSelect: () => console.log("Edit") },
					{ label: "Move to folder", onSelect: () => console.log("Move") },
				],
			},
			{
				items: [
					{
						label: "Delete permanently",
						variant: "destructive",
						shortcut: "Del",
						onSelect: () => console.log("Delete"),
					},
				],
			},
		],
		children: (
			<div className="flex h-32 w-48 items-center justify-center border-2 border-border bg-card font-mono text-xs shadow-pixel inset-shadow-pixel">
				Right-click me
			</div>
		),
	},
};

export const MultiGroup: Story = {
	args: {
		groups: [
			{
				items: [
					{ label: "View source", shortcut: "Ctrl+U", onSelect: () => {} },
					{ label: "Inspect", shortcut: "F12", onSelect: () => {} },
				],
			},
			{
				items: [
					{ label: "Copy link", onSelect: () => {} },
					{ label: "Copy text", onSelect: () => {} },
					{ label: "Save as...", shortcut: "Ctrl+S", onSelect: () => {} },
				],
			},
			{
				items: [
					{ label: "Print", shortcut: "Ctrl+P", onSelect: () => {} },
					{ label: "Settings", onSelect: () => {} },
				],
			},
		],
		children: (
			<div className="flex h-32 w-48 items-center justify-center border-2 border-border bg-card font-mono text-xs shadow-pixel inset-shadow-pixel">
				Right-click me
			</div>
		),
	},
};

export const Disabled: Story = {
	args: {
		groups: [
			{
				items: [
					{ label: "Undo", shortcut: "Ctrl+Z", disabled: true, onSelect: () => {} },
					{ label: "Redo", shortcut: "Ctrl+Y", disabled: true, onSelect: () => {} },
				],
			},
			{
				items: [
					{ label: "Cut", shortcut: "Ctrl+X", onSelect: () => {} },
					{ label: "Copy", shortcut: "Ctrl+C", onSelect: () => {} },
					{ label: "Paste", shortcut: "Ctrl+V", disabled: true, onSelect: () => {} },
				],
			},
		],
		children: (
			<div className="flex h-32 w-48 items-center justify-center border-2 border-border bg-card font-mono text-xs shadow-pixel inset-shadow-pixel">
				Right-click me
			</div>
		),
	},
};
