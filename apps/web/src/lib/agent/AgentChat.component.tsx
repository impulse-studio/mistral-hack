import { useEffect, useRef, useState, useCallback } from "react";

import { PixelBorderBox } from "@/lib/pixel/PixelBorderBox";
import { PixelGlow } from "@/lib/pixel/PixelGlow";
import { PixelText } from "@/lib/pixel/PixelText";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────

export type AgentChatMessageType =
	| "reasoning"
	| "assistant_text"
	| "tool_call"
	| "tool_result"
	| "usage"
	| "status";

export interface AgentChatMessage {
	id: string;
	type: AgentChatMessageType;
	content: string;
	timestamp?: number;
}

interface AgentChatProps {
	messages: AgentChatMessage[];
	title?: string;
	streaming?: boolean;
	className?: string;
}

// ── Usage parser ─────────────────────────────────────────

interface UsageData {
	step?: number;
	inputTokens?: number;
	outputTokens?: number;
	reasoningTokens?: number;
	totalTokens?: number;
	finishReason?: string;
}

function parseUsage(content: string): UsageData | null {
	try {
		return JSON.parse(content) as UsageData;
	} catch {
		return null;
	}
}

// ── Message renderers ────────────────────────────────────

function ReasoningMessage({ content }: { content: string }) {
	const [expanded, setExpanded] = useState(false);
	const isLong = content.length > 200;
	const preview = isLong ? content.slice(0, 200) + "..." : content;

	return (
		<div className="group">
			<div className="mb-1 flex items-center gap-1.5">
				<span className="text-[9px] font-bold uppercase tracking-widest text-cyan-400/80">
					Thinking
				</span>
				<div className="h-px flex-1 bg-cyan-400/10" />
			</div>
			<div
				className={cn(
					"rounded border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 font-mono text-[11px] leading-relaxed text-cyan-300/90",
					"whitespace-pre-wrap break-words",
				)}
			>
				{isLong && !expanded ? preview : content}
				{isLong && (
					<button
						type="button"
						onClick={() => setExpanded(!expanded)}
						className="ml-1 text-[10px] text-cyan-400/60 hover:text-cyan-400"
					>
						{expanded ? "[collapse]" : "[expand]"}
					</button>
				)}
			</div>
		</div>
	);
}

function AssistantTextMessage({ content }: { content: string }) {
	return (
		<div>
			<div className="mb-1 flex items-center gap-1.5">
				<span className="text-[9px] font-bold uppercase tracking-widest text-green-400/80">
					Assistant
				</span>
				<div className="h-px flex-1 bg-green-400/10" />
			</div>
			<div className="rounded border border-green-400/20 bg-green-400/5 px-3 py-2 font-mono text-[11px] leading-relaxed text-green-300/90 whitespace-pre-wrap break-words">
				{content}
			</div>
		</div>
	);
}

function ToolCallMessage({ content }: { content: string }) {
	const [expanded, setExpanded] = useState(false);
	// Parse "[step] toolName(args)" format
	const match = content.match(/^\[step\]\s*(\w+)\((.+)\)$/s);
	const toolName = match?.[1] ?? "tool";
	const args = match?.[2] ?? content;
	const isLong = args.length > 120;

	return (
		<div>
			<div className="flex items-center gap-1.5">
				<span className="text-[9px] font-bold uppercase tracking-widest text-purple-400/80">
					{toolName}
				</span>
				<span className="text-[8px] text-purple-400/40">call</span>
				<div className="h-px flex-1 bg-purple-400/10" />
			</div>
			<div className="mt-1 rounded border border-purple-400/20 bg-purple-400/5 px-3 py-1.5 font-mono text-[10px] leading-relaxed text-purple-300/80 whitespace-pre-wrap break-all">
				{isLong && !expanded ? args.slice(0, 120) + "..." : args}
				{isLong && (
					<button
						type="button"
						onClick={() => setExpanded(!expanded)}
						className="ml-1 text-[9px] text-purple-400/50 hover:text-purple-400"
					>
						{expanded ? "[less]" : "[more]"}
					</button>
				)}
			</div>
		</div>
	);
}

function ToolResultMessage({ content }: { content: string }) {
	const [expanded, setExpanded] = useState(false);
	// Parse "[step] toolName → result" format
	const match = content.match(/^\[step\]\s*(\w+)\s*→\s*(.+)$/s);
	const toolName = match?.[1] ?? "tool";
	const result = match?.[2] ?? content;
	const isLong = result.length > 200;

	return (
		<div>
			<div className="flex items-center gap-1.5">
				<span className="text-[9px] font-bold uppercase tracking-widest text-purple-400/50">
					{toolName}
				</span>
				<span className="text-[8px] text-purple-400/30">result</span>
				<div className="h-px flex-1 bg-purple-400/10" />
			</div>
			<div className="mt-1 rounded border border-purple-400/10 bg-purple-400/[0.03] px-3 py-1.5 font-mono text-[10px] leading-relaxed text-purple-300/60 whitespace-pre-wrap break-all">
				{isLong && !expanded ? result.slice(0, 200) + "..." : result}
				{isLong && (
					<button
						type="button"
						onClick={() => setExpanded(!expanded)}
						className="ml-1 text-[9px] text-purple-400/40 hover:text-purple-400"
					>
						{expanded ? "[less]" : "[more]"}
					</button>
				)}
			</div>
		</div>
	);
}

function UsageMessage({ content }: { content: string }) {
	const usage = parseUsage(content);
	if (!usage) return null;

	return (
		<div className="flex items-center gap-3 rounded bg-white/[0.03] px-3 py-1 font-mono text-[9px] text-muted-foreground/60">
			{usage.step != null && <span>step {usage.step}</span>}
			{usage.inputTokens != null && <span>{usage.inputTokens} in</span>}
			{usage.outputTokens != null && <span>{usage.outputTokens} out</span>}
			{usage.reasoningTokens != null && usage.reasoningTokens > 0 && (
				<span>{usage.reasoningTokens} reasoning</span>
			)}
			{usage.finishReason && <span className="text-muted-foreground/40">{usage.finishReason}</span>}
		</div>
	);
}

function StatusMessage({ content }: { content: string }) {
	return (
		<div className="flex items-center gap-2 px-1 py-0.5">
			<div className="h-px w-4 bg-yellow-400/20" />
			<span className="font-mono text-[10px] text-yellow-400/70">{content}</span>
			<div className="h-px flex-1 bg-yellow-400/20" />
		</div>
	);
}

// ── Main component ───────────────────────────────────────

export function AgentChat({
	messages,
	title = "Agent Chat",
	streaming = false,
	className,
}: AgentChatProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const bottomRef = useRef<HTMLDivElement>(null);
	const [userScrolledUp, setUserScrolledUp] = useState(false);

	const handleScroll = useCallback(() => {
		const container = scrollRef.current;
		if (!container) return;
		const { scrollTop, scrollHeight, clientHeight } = container;
		setUserScrolledUp(scrollHeight - scrollTop - clientHeight > 16);
	}, []);

	useEffect(() => {
		if (userScrolledUp) return;
		bottomRef.current?.scrollIntoView({ block: "end" });
	}, [messages.length, userScrolledUp]);

	return (
		<PixelBorderBox
			elevation="floating"
			className={cn("flex flex-col overflow-hidden bg-[#0D0D11]", className)}
		>
			{/* Header */}
			<div className="flex items-center justify-between border-b-2 border-border bg-card px-3 py-1.5">
				<PixelText variant="label">{title}</PixelText>
				<PixelGlow
					color={streaming ? "orange" : "green"}
					pulse={streaming}
					label={streaming ? "Streaming" : "Connected"}
					size="sm"
				/>
			</div>

			{/* Messages */}
			<div
				ref={scrollRef}
				onScroll={handleScroll}
				className="flex-1 space-y-2.5 overflow-y-auto p-3"
			>
				{messages.length === 0 ? (
					<div className="flex items-center justify-center py-8">
						<PixelText variant="id" color="muted">
							Waiting for agent output...
						</PixelText>
					</div>
				) : (
					messages.map((msg) => (
						<div key={msg.id}>
							{msg.type === "reasoning" && <ReasoningMessage content={msg.content} />}
							{msg.type === "assistant_text" && <AssistantTextMessage content={msg.content} />}
							{msg.type === "tool_call" && <ToolCallMessage content={msg.content} />}
							{msg.type === "tool_result" && <ToolResultMessage content={msg.content} />}
							{msg.type === "usage" && <UsageMessage content={msg.content} />}
							{msg.type === "status" && <StatusMessage content={msg.content} />}
						</div>
					))
				)}
				<div ref={bottomRef} />
			</div>
		</PixelBorderBox>
	);
}
