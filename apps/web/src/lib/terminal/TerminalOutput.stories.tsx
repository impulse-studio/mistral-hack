import type { Meta, StoryObj } from "@storybook/react-vite";

import type { TerminalLine } from "./TerminalOutput.component";
import { TerminalOutput } from "./TerminalOutput.component";

const meta = {
	title: "managed/TerminalOutput",
	component: TerminalOutput,
	decorators: [
		(Story) => (
			<div className="bg-background p-6 h-[500px]">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof TerminalOutput>;

export default meta;
type Story = StoryObj<typeof meta>;

function makeLines(texts: string[]): TerminalLine[] {
	return texts.map((text, i) => ({
		id: `line-${i}`,
		text,
		timestamp: Date.now() - (texts.length - i) * 1000,
	}));
}

const staticLines = makeLines([
	"$ bun install",
	"bun install v1.2.4 (ae194892)",
	"",
	"Resolving dependencies...",
	"Resolved 847 packages in 1.23s",
	"Downloaded 12 packages in 0.8s",
	"",
	"+ @mistralai/mistralai@1.5.0",
	"+ convex@1.21.0",
	"+ react@19.1.0",
	"+ react-dom@19.1.0",
	"+ tailwindcss@4.1.4",
	"",
	"847 packages installed [2.03s]",
	"",
	"$ bun run build",
	"vite v6.3.1 building for production...",
	"transforming (423 modules)...",
	"rendering chunks (8)...",
	"dist/index.html          0.45 kB | gzip: 0.29 kB",
	"dist/assets/index.js   187.34 kB | gzip: 58.12 kB",
]);

export const Static: Story = {
	args: {
		lines: staticLines,
		title: "Build Output",
		status: "connected",
	},
};

const ansiLines = makeLines([
	"\x1b[32m[INFO]\x1b[0m Server started on port 3000",
	"\x1b[33m[WARN]\x1b[0m Deprecated API call detected",
	"\x1b[31m[ERROR]\x1b[0m Failed to connect to database",
	"\x1b[34m[DEBUG]\x1b[0m Query executed in 12ms",
	"\x1b[35m[TRACE]\x1b[0m Entering function parseConfig",
	"\x1b[36m[HTTP]\x1b[0m GET /api/status 200 OK",
	"\x1b[1m\x1b[32mBuild successful!\x1b[0m No errors found.",
	"\x1b[1m\x1b[31mFATAL:\x1b[0m Out of memory — process killed",
	"\x1b[33mWarning:\x1b[0m \x1b[1mUnused variable\x1b[0m 'tempData' in line 42",
	"Plain text with no formatting at all",
	"\x1b[36mcyan\x1b[0m \x1b[35mpurple\x1b[0m \x1b[34mblue\x1b[0m \x1b[33myellow\x1b[0m \x1b[32mgreen\x1b[0m \x1b[31mred\x1b[0m",
]);

export const AnsiColors: Story = {
	args: {
		lines: ansiLines,
		title: "ANSI Colors",
		status: "connected",
	},
};

const longOutputLines = makeLines(
	Array.from({ length: 250 }, (_, i) => {
		const level = i % 5;
		const prefixes = [
			"\x1b[32m[INFO]\x1b[0m",
			"\x1b[33m[WARN]\x1b[0m",
			"\x1b[34m[DEBUG]\x1b[0m",
			"\x1b[36m[HTTP]\x1b[0m",
			"\x1b[35m[TRACE]\x1b[0m",
		];
		return `${prefixes[level]} Processing record ${i + 1}/250 — elapsed ${(i * 0.12).toFixed(2)}s`;
	}),
);

export const LongOutput: Story = {
	args: {
		lines: longOutputLines,
		title: "Long Output",
		status: "streaming",
	},
};

export const Disconnected: Story = {
	args: {
		lines: makeLines([
			"$ ssh agent@sandbox-01",
			"Connection established.",
			"Last login: Fri Feb 27 14:23:01 2026",
			"",
			"\x1b[31m[ERROR]\x1b[0m Connection lost: peer reset",
			"\x1b[33m[WARN]\x1b[0m Attempting reconnect (1/5)...",
			"\x1b[31m[ERROR]\x1b[0m Reconnect failed: timeout after 30s",
		]),
		title: "Agent Shell",
		status: "disconnected",
	},
};

export const Empty: Story = {
	args: {
		lines: [],
		title: "Agent Output",
		status: "connected",
	},
};
