import { useCallback, useEffect, useRef, useState } from "react";

import { PixelBorderBox, PixelGlow, PixelText } from "@/lib/pixel";
import { cn } from "@/lib/utils";

import { terminalAnsiToSpans } from "./AnsiToSpans";

interface TerminalLine {
	id: string;
	text: string;
	timestamp?: number;
}

interface TerminalOutputProps {
	lines: TerminalLine[];
	title?: string;
	status?: "connected" | "disconnected" | "streaming";
	maxLines?: number;
	autoScroll?: boolean;
	onClickLine?: (line: TerminalLine) => void;
	className?: string;
}

const STATUS_GLOW = {
	connected: { color: "green", pulse: false, label: "Connected" },
	disconnected: { color: "red", pulse: false, label: "Disconnected" },
	streaming: { color: "orange", pulse: true, label: "Streaming" },
} as const;

function TerminalOutput({
	lines,
	title = "Terminal",
	status = "connected",
	maxLines = 500,
	autoScroll = true,
	onClickLine,
	className,
}: TerminalOutputProps) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const bottomSentinelRef = useRef<HTMLDivElement>(null);
	const [userScrolledUp, setUserScrolledUp] = useState(false);

	const visibleLines = maxLines > 0 ? lines.slice(-maxLines) : lines;

	const handleScroll = useCallback(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		const { scrollTop, scrollHeight, clientHeight } = container;
		const isAtBottom = scrollHeight - scrollTop - clientHeight < 16;
		setUserScrolledUp(!isAtBottom);
	}, []);

	useEffect(() => {
		if (!autoScroll || userScrolledUp) return;

		const sentinel = bottomSentinelRef.current;
		if (sentinel) {
			sentinel.scrollIntoView({ block: "end" });
		}
	}, [visibleLines.length, autoScroll, userScrolledUp]);

	const glowConfig = STATUS_GLOW[status];

	return (
		<PixelBorderBox
			elevation="floating"
			className={cn("flex flex-col overflow-hidden bg-[#0D0D11]", className)}
		>
			{/* Header */}
			<div className="flex items-center justify-between px-3 py-1.5 border-b-2 border-border bg-card">
				<PixelText variant="label">{title}</PixelText>
				<PixelGlow
					color={glowConfig.color}
					pulse={glowConfig.pulse}
					label={glowConfig.label}
					size="sm"
				/>
			</div>

			{/* Lines */}
			<div
				ref={scrollContainerRef}
				onScroll={handleScroll}
				className="flex-1 overflow-y-auto overflow-x-hidden p-2"
			>
				{visibleLines.length === 0 ? (
					<div className="flex items-center justify-center py-8">
						<PixelText variant="id" color="muted">
							No output
						</PixelText>
					</div>
				) : (
					<div className="flex flex-col">
						{visibleLines.map((line) => (
							<div
								key={line.id}
								role={onClickLine ? "button" : undefined}
								tabIndex={onClickLine ? 0 : undefined}
								onClick={onClickLine ? () => onClickLine(line) : undefined}
								onKeyDown={
									onClickLine
										? (e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													onClickLine(line);
												}
											}
										: undefined
								}
								className={cn(
									"font-mono text-[11px] leading-relaxed text-green-400/90 px-1 whitespace-pre-wrap break-all",
									onClickLine && "hover:bg-white/5 cursor-pointer",
								)}
							>
								{terminalAnsiToSpans(line.text)}
							</div>
						))}
					</div>
				)}
				<div ref={bottomSentinelRef} />
			</div>
		</PixelBorderBox>
	);
}

export { TerminalOutput };
export type { TerminalOutputProps, TerminalLine };
