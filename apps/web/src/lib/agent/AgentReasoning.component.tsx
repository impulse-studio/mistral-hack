import { useState } from "react";

import type { VariantProps } from "class-variance-authority";

import { cva } from "class-variance-authority";

import { PixelBadge, PixelBorderBox, PixelDivider, PixelGlow, PixelText } from "@/lib/pixel";
import { cn } from "@/lib/utils";

type AgentReasoningStepStatus = "completed" | "active" | "pending" | "error";

interface AgentReasoningStep {
	id: string;
	title: string;
	detail?: string;
	status: AgentReasoningStepStatus;
	duration?: number;
}

const agentReasoningStepVariants = cva("flex items-start gap-2 py-1.5", {
	variants: {
		status: {
			completed: "opacity-80",
			active: "",
			pending: "opacity-50",
			error: "",
		},
	},
	defaultVariants: {
		status: "pending",
	},
});

interface AgentReasoningProps extends VariantProps<typeof agentReasoningStepVariants> {
	steps: AgentReasoningStep[];
	title?: string;
	collapsed?: boolean;
	onToggle?: (collapsed: boolean) => void;
	className?: string;
}

const CIRCLED_NUMBERS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

function agentReasoningCircledNumber(index: number): string {
	return CIRCLED_NUMBERS[index] ?? `(${String(index + 1)})`;
}

function agentReasoningFormatDuration(ms: number): string {
	if (ms < 1000) return `${String(ms)}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

function AgentReasoning({
	steps,
	title = "Reasoning",
	collapsed: controlledCollapsed,
	onToggle,
	className,
}: AgentReasoningProps) {
	const [internalCollapsed, setInternalCollapsed] = useState(controlledCollapsed ?? false);
	const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

	const isCollapsed = controlledCollapsed ?? internalCollapsed;

	function handleToggleCollapse() {
		const next = !isCollapsed;
		setInternalCollapsed(next);
		onToggle?.(next);
	}

	function handleToggleStep(stepId: string) {
		setExpandedSteps((prev) => {
			const next = new Set(prev);
			if (next.has(stepId)) {
				next.delete(stepId);
			} else {
				next.add(stepId);
			}
			return next;
		});
	}

	return (
		<PixelBorderBox variant="solid" elevation="raised" className={cn("p-3", className)}>
			{/* Header */}
			<button
				type="button"
				onClick={handleToggleCollapse}
				className="flex w-full cursor-pointer items-center justify-between"
			>
				<PixelText variant="label">{title}</PixelText>
				<PixelText variant="label" color="muted">
					{isCollapsed ? "▶" : "▼"}
				</PixelText>
			</button>

			{/* Steps */}
			{!isCollapsed && (
				<div className="mt-2 flex flex-col">
					{steps.map((step, index) => (
						<div key={step.id}>
							{index > 0 && <PixelDivider variant="dashed" className="my-0.5" />}
							<button
								type="button"
								onClick={() => handleToggleStep(step.id)}
								className={cn(
									"w-full cursor-pointer text-left",
									agentReasoningStepVariants({ status: step.status }),
								)}
							>
								{/* Circled number */}
								<PixelText variant="id" className="shrink-0 select-none">
									{agentReasoningCircledNumber(index)}
								</PixelText>

								{/* Title + optional detail */}
								<div className="flex min-w-0 flex-1 flex-col gap-0.5">
									<PixelText variant="body">{step.title}</PixelText>
									{expandedSteps.has(step.id) && step.detail && (
										<PixelText variant="body" color="muted" className="mt-0.5">
											{step.detail}
										</PixelText>
									)}
								</div>

								{/* Status indicator + duration */}
								<div className="flex shrink-0 items-center gap-1.5">
									{step.duration !== undefined && step.status === "completed" && (
										<PixelText variant="id">
											{agentReasoningFormatDuration(step.duration)}
										</PixelText>
									)}
									{step.status === "active" && <PixelGlow color="cyan" pulse size="sm" />}
									{step.status === "completed" && (
										<PixelBadge color="green" size="sm">
											✓
										</PixelBadge>
									)}
									{step.status === "pending" && (
										<PixelBadge color="muted" size="sm">
											○
										</PixelBadge>
									)}
									{step.status === "error" && (
										<PixelBadge color="red" size="sm">
											✕
										</PixelBadge>
									)}
								</div>
							</button>
						</div>
					))}
				</div>
			)}
		</PixelBorderBox>
	);
}

export { AgentReasoning, agentReasoningStepVariants };
export type { AgentReasoningProps, AgentReasoningStep };
