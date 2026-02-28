import { useState } from "react";

import { PixelAvatar } from "@/lib/pixel/PixelAvatar";
import { PixelBadge } from "@/lib/pixel/PixelBadge";
import { PixelBorderBox } from "@/lib/pixel/PixelBorderBox";
import { PixelGlow } from "@/lib/pixel/PixelGlow";
import { PixelText } from "@/lib/pixel/PixelText";
import { cn } from "@/lib/utils";

type ManagerBarSandboxStatus = "running" | "stopped" | "error" | "provisioning";

const MANAGER_BAR_SANDBOX_CONFIG: Record<
	ManagerBarSandboxStatus,
	{ glowColor: "green" | "muted" | "red" | "orange"; pulse: boolean; label: string }
> = {
	running: { glowColor: "green", pulse: false, label: "Running" },
	stopped: { glowColor: "muted", pulse: false, label: "Stopped" },
	error: { glowColor: "red", pulse: false, label: "Error" },
	provisioning: { glowColor: "orange", pulse: true, label: "Provisioning" },
};

interface ManagerBarProps {
	onSubmitTask: (prompt: string) => void;
	isThinking?: boolean;
	taskCount?: { done: number; total: number };
	agentCount?: number;
	sandboxStatus?: ManagerBarSandboxStatus;
	className?: string;
}

function ManagerBar({
	onSubmitTask,
	isThinking = false,
	taskCount,
	agentCount,
	sandboxStatus = "running",
	className,
}: ManagerBarProps) {
	const [managerBarInput, setManagerBarInput] = useState("");

	const sandboxConfig = MANAGER_BAR_SANDBOX_CONFIG[sandboxStatus];

	function handleManagerBarKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter" && managerBarInput.trim() !== "" && !isThinking) {
			onSubmitTask(managerBarInput.trim());
			setManagerBarInput("");
		}
	}

	return (
		<div className={cn("fixed bottom-0 left-0 right-0 z-40", className)}>
			<PixelBorderBox elevation="floating" className="border-t-[3px] border-t-brand-accent">
				<div className="flex items-center gap-4 px-4 py-3">
					{/* Manager avatar */}
					<PixelAvatar size="lg" initials="M" />

					{/* Input or thinking indicator */}
					<div className="flex flex-1 items-center">
						{isThinking ? (
							<div className="flex items-center gap-2">
								<PixelGlow color="yellow" pulse size="md" />
								<PixelText variant="label" color="muted">
									Thinking...
								</PixelText>
							</div>
						) : (
							<input
								type="text"
								value={managerBarInput}
								onChange={(e) => setManagerBarInput(e.target.value)}
								onKeyDown={handleManagerBarKeyDown}
								placeholder="What should the agents work on?"
								className="flex-1 border-2 border-border bg-transparent px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-accent focus:outline-none"
							/>
						)}
					</div>

					{/* Status indicators */}
					<div className="flex shrink-0 items-center gap-3">
						{taskCount && (
							<PixelBadge color="cyan" size="md">
								Tasks {taskCount.done}/{taskCount.total}
							</PixelBadge>
						)}
						{agentCount !== undefined && (
							<PixelBadge color="purple" size="md">
								Agents: {agentCount}
							</PixelBadge>
						)}
						<PixelGlow
							color={sandboxConfig.glowColor}
							pulse={sandboxConfig.pulse}
							label={sandboxConfig.label}
							size="md"
						/>
					</div>
				</div>
			</PixelBorderBox>
		</div>
	);
}

export { ManagerBar };
export type { ManagerBarProps };
