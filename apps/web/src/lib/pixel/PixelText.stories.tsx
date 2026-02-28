import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelText } from "./PixelText";

const meta = {
	title: "primitives/PixelText",
	component: PixelText,
	argTypes: {
		variant: {
			control: "select",
			options: ["label", "id", "body", "heading", "code"],
		},
		color: {
			control: "select",
			options: ["default", "muted", "accent", "success", "error", "warning"],
		},
		as: {
			control: "select",
			options: ["span", "p", "h1", "h2", "h3", "h4", "label", "code", "pre"],
		},
	},
	decorators: [
		(Story) => (
			<div className="bg-background p-6">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof PixelText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		children: "The quick brown fox jumps over the lazy dog",
		variant: "body",
		color: "default",
	},
};

export const AllVariants: Story = {
	args: { children: "All variants" },
	render: () => (
		<div className="flex flex-col gap-4">
			<PixelText variant="label">Label — metadata, badges, column headers</PixelText>
			<PixelText variant="id">ID-42 — task IDs, codes</PixelText>
			<PixelText as="p" variant="body">
				Body — descriptions, paragraphs, general content text
			</PixelText>
			<PixelText as="h2" variant="heading">
				Heading — section titles
			</PixelText>
			<PixelText as="code" variant="code">
				code — terminal output, code snippets
			</PixelText>
		</div>
	),
};

export const AllColors: Story = {
	args: { children: "All colors" },
	render: () => (
		<div className="flex flex-col gap-3">
			<PixelText variant="label" color="default">
				Default color
			</PixelText>
			<PixelText variant="label" color="muted">
				Muted color
			</PixelText>
			<PixelText variant="label" color="accent">
				Accent color
			</PixelText>
			<PixelText variant="label" color="success">
				Success color
			</PixelText>
			<PixelText variant="label" color="error">
				Error color
			</PixelText>
			<PixelText variant="label" color="warning">
				Warning color
			</PixelText>
		</div>
	),
};

export const Heading: Story = {
	args: {
		as: "h2",
		variant: "heading",
		children: "Agent Dashboard",
	},
};

export const CodeBlock: Story = {
	args: {
		as: "pre",
		variant: "code",
		children: `$ mistral-agent deploy --env production
  ✓ Building sandbox image...
  ✓ Uploading artifacts (3 files)
  ✓ Agent "coder-01" deployed
  → Endpoint: https://office.ai/agents/coder-01`,
	},
};

export const InCard: Story = {
	args: { children: "In card" },
	render: () => (
		<div className="flex max-w-xs flex-col gap-3 border-2 border-border bg-card p-4 shadow-pixel inset-shadow-pixel">
			<PixelText as="h3" variant="heading">
				Sprint Overview
			</PixelText>
			<PixelText as="p" variant="body" color="muted">
				The current sprint has 12 tasks across 3 agents. Two tasks are blocked on sandbox
				provisioning.
			</PixelText>
			<div className="flex items-center gap-2">
				<PixelText variant="label" color="success">
					8 Done
				</PixelText>
				<PixelText variant="label" color="warning">
					2 In Progress
				</PixelText>
				<PixelText variant="label" color="error">
					2 Blocked
				</PixelText>
			</div>
			<PixelText variant="id">AIO-Sprint-04</PixelText>
		</div>
	),
};
