import type { ReactNode } from "react";

const ANSI_COLOR_MAP: Record<string, string> = {
	"31": "text-red-400",
	"32": "text-green-400",
	"33": "text-yellow-400",
	"34": "text-blue-400",
	"35": "text-purple-400",
	"36": "text-cyan-400",
};

const ANSI_REGEX = /\x1b\[([0-9;]+)m/g;

/**
 * Parse a string potentially containing ANSI escape codes and return
 * an array of styled `<span>` elements.
 */
function terminalAnsiToSpans(text: string): ReactNode[] {
	const result: ReactNode[] = [];
	let lastIndex = 0;
	let currentClasses: string[] = [];
	let segmentIndex = 0;

	ANSI_REGEX.lastIndex = 0;
	let match = ANSI_REGEX.exec(text);

	while (match !== null) {
		// Push text before this escape sequence
		if (match.index > lastIndex) {
			const segment = text.slice(lastIndex, match.index);
			if (currentClasses.length > 0) {
				result.push(
					<span key={segmentIndex} className={currentClasses.join(" ")}>
						{segment}
					</span>,
				);
			} else {
				result.push(<span key={segmentIndex}>{segment}</span>);
			}
			segmentIndex++;
		}

		// Parse the escape code(s)
		const codes = match[1]!.split(";");
		for (const code of codes) {
			if (code === "0") {
				// Reset
				currentClasses = [];
			} else if (code === "1") {
				// Bold
				if (!currentClasses.includes("font-bold")) {
					currentClasses = [...currentClasses, "font-bold"];
				}
			} else if (ANSI_COLOR_MAP[code]) {
				// Replace any existing color class
				currentClasses = [
					...currentClasses.filter((c) => !c.startsWith("text-")),
					ANSI_COLOR_MAP[code]!,
				];
			}
		}

		lastIndex = match.index + match[0].length;
		match = ANSI_REGEX.exec(text);
	}

	// Remaining text after last escape
	if (lastIndex < text.length) {
		const segment = text.slice(lastIndex);
		if (currentClasses.length > 0) {
			result.push(
				<span key={segmentIndex} className={currentClasses.join(" ")}>
					{segment}
				</span>,
			);
		} else {
			result.push(<span key={segmentIndex}>{segment}</span>);
		}
	}

	// If the string had no ANSI codes at all, return a single span
	if (result.length === 0) {
		result.push(<span key={0}>{text}</span>);
	}

	return result;
}

export { terminalAnsiToSpans };
