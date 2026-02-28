import type { Meta, StoryObj } from "@storybook/react-vite";

import type { ChatWindowMessage } from "./ChatWindow.component";
import { ChatWindow } from "./ChatWindow.component";

const meta = {
	title: "managed/ChatWindow",
	component: ChatWindow,
	decorators: [
		(Story) => (
			<div className="bg-background p-6 h-[600px]" style={{ maxWidth: 520 }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ChatWindow>;

export default meta;
type Story = StoryObj<typeof meta>;

const CHAT_WINDOW_SAMPLE_MESSAGES: ChatWindowMessage[] = [
	{
		key: "msg-1",
		role: "user",
		text: "Can you set up a REST API for the user service?",
		status: "complete",
	},
	{
		key: "msg-2",
		role: "assistant",
		text: "I'll set up the REST API for the user service. Let me create the routes and handlers.\n\nHere's what I'll implement:\n- `GET /api/users` — list all users\n- `GET /api/users/:id` — get user by ID\n- `POST /api/users` — create a new user\n- `PUT /api/users/:id` — update user\n- `DELETE /api/users/:id` — delete user\n\nI'll use Express with TypeScript and add input validation via Zod.",
		status: "complete",
	},
	{
		key: "msg-3",
		role: "user",
		text: "Sounds good. Also add authentication middleware.",
		status: "complete",
	},
	{
		key: "msg-4",
		role: "assistant",
		text: "Done! I've added JWT-based auth middleware that:\n\n1. Validates the `Authorization: Bearer <token>` header\n2. Decodes and verifies the token against `process.env.JWT_SECRET`\n3. Attaches `req.user` with the decoded payload\n\nProtected routes now use `app.use('/api/users', authMiddleware)`. The `POST /api/auth/login` endpoint returns a signed token.",
		status: "complete",
	},
];

export const Default: Story = {
	args: {
		messages: CHAT_WINDOW_SAMPLE_MESSAGES,
		onSend: (text) => console.log("Send:", text),
		title: "Manager Chat",
	},
};

export const Empty: Story = {
	args: {
		messages: [],
		onSend: (text) => console.log("Send:", text),
		title: "Manager Chat",
	},
};

export const Streaming: Story = {
	args: {
		messages: [
			...CHAT_WINDOW_SAMPLE_MESSAGES,
			{
				key: "msg-5",
				role: "user",
				text: "Can you add rate limiting too?",
				status: "complete",
			},
			{
				key: "msg-6",
				role: "assistant",
				text: "Sure, I'll add rate limiting using `express-rate-limit`. Setting up a window of 15 minutes with a max of 100 requests per IP...",
				status: "streaming",
			},
		],
		onSend: (text) => console.log("Send:", text),
		title: "Manager Chat",
	},
};

export const Loading: Story = {
	args: {
		messages: [
			...CHAT_WINDOW_SAMPLE_MESSAGES,
			{
				key: "msg-5",
				role: "user",
				text: "Deploy it to production.",
				status: "complete",
			},
		],
		onSend: (text) => console.log("Send:", text),
		isLoading: true,
		title: "Manager Chat",
	},
};

export const PanelVariant: Story = {
	args: {
		messages: CHAT_WINDOW_SAMPLE_MESSAGES,
		onSend: (text) => console.log("Send:", text),
		variant: "panel",
		title: "Agent Chat",
	},
};
