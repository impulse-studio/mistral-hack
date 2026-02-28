import type { Meta, StoryObj } from "@storybook/react-vite";

import { notificationToast, NotificationToaster } from "./NotificationToast.component";

function NotificationToastTrigger() {
	return null;
}

const meta = {
	title: "managed/NotificationToast",
	component: NotificationToastTrigger,
	decorators: [
		(Story) => (
			<div className="bg-background p-6">
				<NotificationToaster />
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof NotificationToastTrigger>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
	args: {},
	render: () => (
		<button
			type="button"
			className="border-2 border-border bg-card px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-foreground shadow-pixel hover:shadow-pixel-hover cursor-pointer"
			onClick={() =>
				notificationToast({
					type: "success",
					title: "Task completed",
					description: "Agent finished implementing the feature.",
				})
			}
		>
			Show Success
		</button>
	),
};

export const Error: Story = {
	args: {},
	render: () => (
		<button
			type="button"
			className="border-2 border-border bg-card px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-foreground shadow-pixel hover:shadow-pixel-hover cursor-pointer"
			onClick={() =>
				notificationToast({
					type: "error",
					title: "Build failed",
					description: "TypeScript compilation encountered 3 errors.",
				})
			}
		>
			Show Error
		</button>
	),
};

export const Warning: Story = {
	args: {},
	render: () => (
		<button
			type="button"
			className="border-2 border-border bg-card px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-foreground shadow-pixel hover:shadow-pixel-hover cursor-pointer"
			onClick={() =>
				notificationToast({
					type: "warning",
					title: "Rate limit approaching",
					description: "85% of API quota consumed.",
				})
			}
		>
			Show Warning
		</button>
	),
};

export const AgentUpdate: Story = {
	args: {},
	render: () => (
		<button
			type="button"
			className="border-2 border-border bg-card px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-foreground shadow-pixel hover:shadow-pixel-hover cursor-pointer"
			onClick={() =>
				notificationToast({
					type: "agent",
					title: "Agent started",
					description: "Mistral Vibe is working on AIO-42.",
					badge: { text: "Agent", color: "orange" },
				})
			}
		>
			Show Agent Update
		</button>
	),
};

export const WithAction: Story = {
	args: {},
	render: () => (
		<button
			type="button"
			className="border-2 border-border bg-card px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-foreground shadow-pixel hover:shadow-pixel-hover cursor-pointer"
			onClick={() =>
				notificationToast({
					type: "info",
					title: "New commit pushed",
					description: "Branch feature/auth updated with 3 commits.",
					action: {
						label: "View diff",
						onClick: () => {
							/* noop for story */
						},
					},
				})
			}
		>
			Show With Action
		</button>
	),
};

export const AllTypes: Story = {
	args: {},
	render: () => (
		<div className="flex flex-wrap gap-2">
			<button
				type="button"
				className="border-2 border-border bg-card px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-foreground shadow-pixel hover:shadow-pixel-hover cursor-pointer"
				onClick={() =>
					notificationToast({
						type: "success",
						title: "Success toast",
					})
				}
			>
				Success
			</button>
			<button
				type="button"
				className="border-2 border-border bg-card px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-foreground shadow-pixel hover:shadow-pixel-hover cursor-pointer"
				onClick={() =>
					notificationToast({
						type: "error",
						title: "Error toast",
					})
				}
			>
				Error
			</button>
			<button
				type="button"
				className="border-2 border-border bg-card px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-foreground shadow-pixel hover:shadow-pixel-hover cursor-pointer"
				onClick={() =>
					notificationToast({
						type: "warning",
						title: "Warning toast",
					})
				}
			>
				Warning
			</button>
			<button
				type="button"
				className="border-2 border-border bg-card px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-foreground shadow-pixel hover:shadow-pixel-hover cursor-pointer"
				onClick={() =>
					notificationToast({
						type: "info",
						title: "Info toast",
					})
				}
			>
				Info
			</button>
			<button
				type="button"
				className="border-2 border-border bg-card px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-foreground shadow-pixel hover:shadow-pixel-hover cursor-pointer"
				onClick={() =>
					notificationToast({
						type: "agent",
						title: "Agent toast",
						badge: { text: "Vibe", color: "orange" },
					})
				}
			>
				Agent
			</button>
		</div>
	),
};
