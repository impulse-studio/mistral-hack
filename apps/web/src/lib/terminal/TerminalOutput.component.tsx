import { useCallback, useEffect, useRef, useState } from "react";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogClose,
} from "@/components/ui/dialog";
import { PixelBorderBox } from "@/lib/pixel/PixelBorderBox";
import { PixelGlow } from "@/lib/pixel/PixelGlow";
import { PixelText } from "@/lib/pixel/PixelText";
import { cn } from "@/lib/utils";

import { terminalAnsiToSpans } from "./AnsiToSpans";

type TerminalLineType =
	| "stdout"
	| "stderr"
	| "command"
	| "status"
	| "tool_call"
	| "tool_result"
	| "screenshot";

interface TerminalLine {
	id: string;
	text: string;
	timestamp?: number;
	logType?: TerminalLineType;
	screenshotUrl?: string | null;
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

const LOG_TYPE_COLOR: Record<string, string> = {
	command: "text-cyan-400",
	stderr: "text-red-400/90",
	tool_call: "text-purple-400",
	tool_result: "text-purple-400/70",
	status: "text-yellow-400/90",
	screenshot: "text-blue-400/80",
	stdout: "text-green-400/90",
};

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
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
		<>
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
							{visibleLines.map((line) => {
								const lineColor = LOG_TYPE_COLOR[line.logType ?? "stdout"] ?? "text-green-400/90";
								return (
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
											`font-mono text-[11px] leading-relaxed px-1 whitespace-pre-wrap break-all ${lineColor}`,
											onClickLine && "hover:bg-white/5 cursor-pointer",
										)}
									>
										{terminalAnsiToSpans(line.text)}
										{line.screenshotUrl && (
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													setPreviewUrl(line.screenshotUrl!);
												}}
												className="mt-1 block cursor-zoom-in"
											>
												<img
													src={line.screenshotUrl}
													alt="Screenshot"
													className="max-h-24 max-w-[200px] border-2 border-border object-contain hover:border-primary/60 transition-colors"
													style={{ imageRendering: "pixelated" }}
													loading="lazy"
												/>
											</button>
										)}
									</div>
								);
							})}
						</div>
					)}
					<div ref={bottomSentinelRef} />
				</div>
			</PixelBorderBox>

			{/* Screenshot preview modal */}
			<Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
				<DialogContent className="max-w-[90vw] max-h-[90vh] w-auto p-0">
					<DialogHeader>
						<DialogTitle>Screenshot</DialogTitle>
						<DialogClose className="font-mono text-xs text-muted-foreground hover:text-foreground cursor-pointer">
							[X]
						</DialogClose>
					</DialogHeader>
					{previewUrl && (
						<div className="flex items-center justify-center p-4 overflow-auto">
							<img
								src={previewUrl}
								alt="Screenshot preview"
								className="max-w-full max-h-[75vh] object-contain border-2 border-border"
							/>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}

export { TerminalOutput };
export type { TerminalOutputProps, TerminalLine, TerminalLineType };
