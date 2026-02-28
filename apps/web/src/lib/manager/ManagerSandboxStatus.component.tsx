import { PixelBorderBox, PixelGlow, PixelProgress, PixelText, PixelTooltip } from "@/lib/pixel";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
	running: { color: "green", label: "Running", pulse: false },
	stopped: { color: "muted", label: "Stopped", pulse: false },
	error: { color: "red", label: "Error", pulse: false },
	provisioning: { color: "orange", label: "Starting...", pulse: true },
	connecting: { color: "cyan", label: "Connecting...", pulse: true },
} as const;

type ResourceColor = "green" | "orange" | "red";

function getResourceColor(value: number): ResourceColor {
	if (value <= 60) return "green";
	if (value <= 80) return "orange";
	return "red";
}

export interface ManagerSandboxStatusProps {
	status: "running" | "stopped" | "error" | "provisioning" | "connecting";
	uptime?: string;
	region?: string;
	memory?: number;
	cpu?: number;
	variant?: "compact" | "expanded";
	className?: string;
}

function ManagerSandboxStatusCompact({
	status,
	uptime,
	region,
	memory,
	cpu,
	className,
}: Omit<ManagerSandboxStatusProps, "variant">) {
	const config = STATUS_CONFIG[status];

	const tooltipContent = (
		<div className="flex flex-col gap-1">
			<PixelText variant="label">{config.label}</PixelText>
			{uptime && (
				<PixelText variant="id" color="muted">
					Uptime: {uptime}
				</PixelText>
			)}
			{region && (
				<PixelText variant="id" color="muted">
					Region: {region}
				</PixelText>
			)}
			{cpu !== undefined && (
				<PixelText variant="id" color="muted">
					CPU: {cpu}%
				</PixelText>
			)}
			{memory !== undefined && (
				<PixelText variant="id" color="muted">
					MEM: {memory}%
				</PixelText>
			)}
		</div>
	);

	return (
		<PixelTooltip content={tooltipContent} side="bottom">
			<span
				data-slot="manager-sandbox-status"
				className={cn("inline-flex items-center gap-1.5", className)}
			>
				<PixelGlow color={config.color} pulse={config.pulse} />
				<PixelText variant="label" color="muted">
					{config.label}
				</PixelText>
			</span>
		</PixelTooltip>
	);
}

function ManagerSandboxStatusExpanded({
	status,
	uptime,
	region,
	memory,
	cpu,
	className,
}: Omit<ManagerSandboxStatusProps, "variant">) {
	const config = STATUS_CONFIG[status];

	return (
		<PixelBorderBox
			variant="solid"
			elevation="raised"
			className={cn("flex flex-col gap-2.5 p-3", className)}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<PixelGlow color={config.color} pulse={config.pulse} />
					<PixelText variant="label">{config.label}</PixelText>
				</div>
				{region && (
					<PixelText variant="id" color="muted">
						{region}
					</PixelText>
				)}
			</div>

			{uptime && (
				<div className="flex items-center justify-between">
					<PixelText variant="id" color="muted">
						Uptime
					</PixelText>
					<PixelText variant="id">{uptime}</PixelText>
				</div>
			)}

			{cpu !== undefined && (
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<PixelText variant="id" color="muted">
							CPU
						</PixelText>
						<PixelText variant="id">{cpu}%</PixelText>
					</div>
					<PixelProgress value={cpu} color={getResourceColor(cpu)} segments={10} size="sm" />
				</div>
			)}

			{memory !== undefined && (
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<PixelText variant="id" color="muted">
							MEM
						</PixelText>
						<PixelText variant="id">{memory}%</PixelText>
					</div>
					<PixelProgress value={memory} color={getResourceColor(memory)} segments={10} size="sm" />
				</div>
			)}
		</PixelBorderBox>
	);
}

function ManagerSandboxStatus({ variant = "compact", ...props }: ManagerSandboxStatusProps) {
	if (variant === "expanded") {
		return <ManagerSandboxStatusExpanded {...props} />;
	}
	return <ManagerSandboxStatusCompact {...props} />;
}

export { ManagerSandboxStatus };
