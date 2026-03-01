import { Button } from "./button";

export const PIXELATED_STYLE = { imageRendering: "pixelated" } as const;

export const DIALOG_CLOSE_BUTTON_GHOST = (
	<Button variant="ghost" size="icon-xs" className="border-2 border-border bg-card" />
);

export const DIALOG_CLOSE_BUTTON_DEFAULT = (
	<Button variant="default" size="icon-xs" className="text-muted-foreground" />
);
