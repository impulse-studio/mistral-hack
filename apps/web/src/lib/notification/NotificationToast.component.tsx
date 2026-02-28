import { toast, Toaster } from "sonner";

import { PixelBadge, PixelBorderBox, PixelText } from "@/lib/pixel";
import { cn } from "@/lib/utils";

interface NotificationToastOptions {
	type?: "success" | "error" | "warning" | "info" | "agent";
	title: string;
	description?: string;
	badge?: {
		text: string;
		color: "blue" | "purple" | "red" | "green" | "yellow" | "orange" | "pink" | "cyan" | "muted";
	};
	duration?: number;
	action?: { label: string; onClick: () => void };
}

const typeAccentClasses: Record<NonNullable<NotificationToastOptions["type"]>, string> = {
	success: "border-l-[3px] border-l-green-500",
	error: "border-l-[3px] border-l-red-500",
	warning: "border-l-[3px] border-l-yellow-500",
	info: "border-l-[3px] border-l-cyan-500",
	agent: "border-l-[3px] border-l-orange-500",
};

function NotificationToastContent({
	type = "info",
	title,
	description,
	badge,
	action,
}: Omit<NotificationToastOptions, "duration">) {
	return (
		<PixelBorderBox
			variant="solid"
			elevation="floating"
			className={cn("p-3 min-w-[300px]", typeAccentClasses[type])}
		>
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center gap-2">
					<PixelText variant="label">{title}</PixelText>
					{badge && (
						<PixelBadge color={badge.color} size="sm">
							{badge.text}
						</PixelBadge>
					)}
				</div>
				{description && (
					<PixelText variant="body" color="muted">
						{description}
					</PixelText>
				)}
				{action && (
					<button
						type="button"
						onClick={action.onClick}
						className="mt-1 self-start font-mono text-[10px] uppercase tracking-widest text-brand-accent hover:text-orange-400 cursor-pointer"
					>
						{action.label}
					</button>
				)}
			</div>
		</PixelBorderBox>
	);
}

function notificationToast(options: NotificationToastOptions): string | number {
	const { duration = 4000, ...rest } = options;

	return toast.custom(() => <NotificationToastContent {...rest} />, { duration });
}

function NotificationToaster() {
	return (
		<Toaster
			position="bottom-right"
			toastOptions={{
				unstyled: true,
			}}
			style={
				{
					"--offset": "16px",
				} as React.CSSProperties
			}
		/>
	);
}

export { notificationToast, NotificationToaster };
export type { NotificationToastOptions };
