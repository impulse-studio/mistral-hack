import { ZOOM_FIXED } from "./constants";

/** Map status prefixes back to tool names for animation selection */
export const STATUS_TO_TOOL: Record<string, string> = {
	Reading: "Read",
	Searching: "Grep",
	Globbing: "Glob",
	Fetching: "WebFetch",
	"Searching web": "WebSearch",
	Writing: "Write",
	Editing: "Edit",
	Running: "Bash",
	Task: "Task",
};

export function extractToolName(status: string): string | null {
	for (const [prefix, tool] of Object.entries(STATUS_TO_TOOL)) {
		if (status.startsWith(prefix)) return tool;
	}
	const first = status.split(/[\s:]/)[0];
	return first || null;
}

/** Fixed zoom level */
export function defaultZoom(): number {
	return ZOOM_FIXED;
}
