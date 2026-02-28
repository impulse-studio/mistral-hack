import type { VariantProps } from "class-variance-authority";

import { cva } from "class-variance-authority";

import {
	PixelAvatar,
	PixelBadge,
	PixelBorderBox,
	PixelDivider,
	PixelGlow,
	PixelText,
} from "@/lib/pixel";
import { cn } from "@/lib/utils";

type AgentCardStatus = "idle" | "coding" | "thinking" | "error" | "done";

type AgentCardRoleColor =
	| "blue"
	| "purple"
	| "red"
	| "green"
	| "yellow"
	| "orange"
	| "pink"
	| "cyan"
	| "muted";

const agentCardStatusVariants = cva("", {
	variants: {
		status: {
			idle: "",
			coding: "",
			thinking: "",
			error: "",
			done: "",
		},
	},
	defaultVariants: {
		status: "idle",
	},
});

const AGENT_CARD_STATUS_CONFIG: Record<
	AgentCardStatus,
	{
		glowColor: "muted" | "cyan" | "yellow" | "red" | "green";
		pulse: boolean;
		badgeColor: "muted" | "cyan" | "yellow" | "red" | "green";
		label: string;
	}
> = {
	idle: { glowColor: "muted", pulse: false, badgeColor: "muted", label: "Idle" },
	coding: { glowColor: "cyan", pulse: true, badgeColor: "cyan", label: "Coding" },
	thinking: { glowColor: "yellow", pulse: true, badgeColor: "yellow", label: "Thinking" },
	error: { glowColor: "red", pulse: false, badgeColor: "red", label: "Error" },
	done: { glowColor: "green", pulse: false, badgeColor: "green", label: "Done" },
};

const AGENT_CARD_AVATAR_STATUS_MAP: Record<AgentCardStatus, "idle" | "active" | "error"> = {
	idle: "idle",
	coding: "active",
	thinking: "active",
	done: "active",
	error: "error",
};

interface AgentCardProps extends VariantProps<typeof agentCardStatusVariants> {
	id: string;
	name: string;
	role: string;
	roleColor?: AgentCardRoleColor;
	status: AgentCardStatus;
	currentTask?: string;
	avatarInitials: string;
	avatarColor?: string;
	onClick?: () => void;
	className?: string;
}

function AgentCard({
	id,
	name,
	role,
	roleColor = "muted",
	status,
	currentTask,
	avatarInitials,
	avatarColor,
	onClick,
	className,
}: AgentCardProps) {
	const statusConfig = AGENT_CARD_STATUS_CONFIG[status];
	const avatarStatus = AGENT_CARD_AVATAR_STATUS_MAP[status];

	return (
		<div
			role={onClick ? "button" : undefined}
			tabIndex={onClick ? 0 : undefined}
			onClick={onClick}
			onKeyDown={
				onClick
					? (e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								onClick();
							}
						}
					: undefined
			}
			className={cn(onClick && "cursor-pointer", className)}
		>
			<PixelBorderBox variant="solid" elevation="raised" interactive={!!onClick} className="p-3">
				{/* Top row: Avatar + Name/ID left, Glow right */}
				<div className="flex items-start justify-between gap-2">
					<div className="flex items-center gap-2">
						<PixelAvatar
							initials={avatarInitials}
							color={avatarColor}
							size="lg"
							status={avatarStatus}
						/>
						<div className="flex flex-col gap-0.5">
							<PixelText variant="heading">{name}</PixelText>
							<PixelText variant="id">{id}</PixelText>
						</div>
					</div>
					<PixelGlow color={statusConfig.glowColor} pulse={statusConfig.pulse} size="md" />
				</div>

				{/* Second row: role badge + status badge */}
				<div className="mt-2 flex items-center gap-1.5">
					<PixelBadge color={roleColor} size="sm">
						{role}
					</PixelBadge>
					<PixelBadge color={statusConfig.badgeColor} size="sm">
						{statusConfig.label}
					</PixelBadge>
				</div>

				{/* Conditional: task section */}
				{currentTask && (
					<>
						<PixelDivider variant="dashed" className="my-2" />
						<PixelText variant="body" color="muted" className="line-clamp-2">
							{currentTask}
						</PixelText>
					</>
				)}
			</PixelBorderBox>
		</div>
	);
}

export { AgentCard, agentCardStatusVariants };
export type { AgentCardProps };
