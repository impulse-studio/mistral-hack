import type { ToasterProps } from "sonner";

import {
	CircleCheckIcon,
	InfoIcon,
	Loader2Icon,
	OctagonXIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

const toasterIcons = {
	success: <CircleCheckIcon className="size-4" />,
	info: <InfoIcon className="size-4" />,
	warning: <TriangleAlertIcon className="size-4" />,
	error: <OctagonXIcon className="size-4" />,
	loading: <Loader2Icon className="size-4 animate-spin" />,
};

const toasterStyle = {
	"--normal-bg": "var(--popover)",
	"--normal-text": "var(--popover-foreground)",
	"--normal-border": "var(--border)",
	"--border-radius": "var(--radius)",
} as React.CSSProperties;

const toasterOptions = {
	classNames: {
		toast: "cn-toast",
	},
};

const Toaster = ({ ...props }: ToasterProps) => {
	const { theme = "system" } = useTheme();

	return (
		<Sonner
			theme={theme as ToasterProps["theme"]}
			className="toaster group"
			icons={toasterIcons}
			style={toasterStyle}
			toastOptions={toasterOptions}
			{...props}
		/>
	);
};

export { Toaster };
