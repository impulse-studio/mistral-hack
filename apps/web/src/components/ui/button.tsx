import type { VariantProps } from "class-variance-authority";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-none border-2 border-transparent bg-clip-padding text-xs font-medium focus-visible:ring-1 aria-invalid:ring-1 [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none",
	{
		variants: {
			variant: {
				default:
					"border-border bg-card shadow-pixel hover:-translate-x-px hover:-translate-y-px hover:shadow-pixel-hover active:translate-x-px active:translate-y-px",
				elevated:
					"border-border bg-card shadow-pixel inset-shadow-pixel hover:border-muted-foreground/40 hover:-translate-x-px hover:-translate-y-px hover:shadow-pixel-hover hover:inset-shadow-pixel-hover active:translate-x-px active:translate-y-px active:shadow-none active:inset-shadow-pressed",
				accent:
					"border-orange-700 bg-brand-accent text-white shadow-pixel-hover inset-shadow-bevel hover:inset-shadow-bevel-hover hover:shadow-pixel-lg hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px active:shadow-none active:inset-shadow-pressed",
				outline:
					"border-border bg-background shadow-pixel hover:-translate-x-px hover:-translate-y-px hover:bg-muted hover:shadow-pixel-hover active:translate-x-px active:translate-y-px",
				dashed: "border-dashed border-border hover:border-brand-accent hover:text-brand-accent",
				ghost:
					"hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground",
				link: "text-brand-accent hover:text-orange-400",
				destructive:
					"border-red-500/50 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:-translate-x-px hover:-translate-y-px hover:shadow-pixel-hover active:translate-x-px active:translate-y-px",
			},
			size: {
				default:
					"h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
				xs: "h-6 gap-1 rounded-none px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-7 gap-1 rounded-none px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
				lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
				icon: "size-8",
				"icon-xs": "size-6 rounded-none [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-7 rounded-none",
				"icon-lg": "size-9",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Button({
	className,
	variant = "default",
	size = "default",
	...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
	return (
		<ButtonPrimitive
			data-slot="button"
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
