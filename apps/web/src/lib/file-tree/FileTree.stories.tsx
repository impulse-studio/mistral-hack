import type { Meta, StoryObj } from "@storybook/react-vite";

import type { FileTreeNodeData } from "./FileTree.component";
import { FileTree } from "./FileTree.component";

const meta = {
	title: "managed/FileTree",
	component: FileTree,
	argTypes: {
		onSelectFile: { action: "selectFile" },
	},
	decorators: [
		(Story) => (
			<div className="bg-background p-6 max-w-xs">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof FileTree>;

export default meta;
type Story = StoryObj<typeof meta>;

const typicalRoot: FileTreeNodeData = {
	name: "ai-office",
	type: "directory",
	children: [
		{
			name: "src",
			type: "directory",
			children: [
				{
					name: "components",
					type: "directory",
					children: [
						{ name: "App.tsx", type: "file", language: "tsx" },
						{ name: "Header.tsx", type: "file", language: "tsx" },
						{ name: "Sidebar.tsx", type: "file", language: "tsx" },
					],
				},
				{
					name: "lib",
					type: "directory",
					children: [
						{ name: "utils.ts", type: "file", language: "ts" },
						{ name: "api.ts", type: "file", language: "ts" },
					],
				},
				{ name: "main.tsx", type: "file", language: "tsx" },
				{ name: "index.css", type: "file", language: "css" },
			],
		},
		{
			name: "packages",
			type: "directory",
			children: [
				{
					name: "backend",
					type: "directory",
					children: [
						{ name: "schema.ts", type: "file", language: "ts" },
						{ name: "agent.ts", type: "file", language: "ts" },
					],
				},
				{
					name: "config",
					type: "directory",
					children: [{ name: "tsconfig.json", type: "file", language: "json" }],
				},
			],
		},
		{ name: "package.json", type: "file", language: "json" },
		{ name: "tsconfig.json", type: "file", language: "json" },
		{ name: "README.md", type: "file", language: "md" },
	],
};

export const Default: Story = {
	args: {
		root: typicalRoot,
		defaultExpanded: ["src", "src/components", "packages"],
	},
};

const deepRoot: FileTreeNodeData = {
	name: "project",
	type: "directory",
	children: [
		{
			name: "level-1",
			type: "directory",
			children: [
				{
					name: "level-2",
					type: "directory",
					children: [
						{
							name: "level-3",
							type: "directory",
							children: [
								{
									name: "level-4",
									type: "directory",
									children: [
										{
											name: "level-5",
											type: "directory",
											children: [{ name: "deep-file.ts", type: "file", language: "ts" }],
										},
									],
								},
								{ name: "mid-file.json", type: "file", language: "json" },
							],
						},
					],
				},
			],
		},
	],
};

export const DeepNesting: Story = {
	args: {
		root: deepRoot,
		defaultExpanded: [
			"level-1",
			"level-1/level-2",
			"level-1/level-2/level-3",
			"level-1/level-2/level-3/level-4",
			"level-1/level-2/level-3/level-4/level-5",
		],
	},
};

export const ActiveFile: Story = {
	args: {
		root: typicalRoot,
		defaultExpanded: ["src", "src/lib"],
		activeFile: "src/lib/utils.ts",
	},
};

export const AllCollapsed: Story = {
	args: {
		root: typicalRoot,
	},
};

const singleFileRoot: FileTreeNodeData = {
	name: "minimal",
	type: "directory",
	children: [{ name: "index.ts", type: "file", language: "ts" }],
};

export const SingleFile: Story = {
	args: {
		root: singleFileRoot,
	},
};
