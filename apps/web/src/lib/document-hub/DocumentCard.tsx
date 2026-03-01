import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, { text: string; color: string }> = {
	note: { text: "Note", color: "text-blue-400 border-blue-500/40 bg-blue-500/10" },
	reference: { text: "Reference", color: "text-green-400 border-green-500/40 bg-green-500/10" },
	code_doc: { text: "Code Doc", color: "text-purple-400 border-purple-500/40 bg-purple-500/10" },
	upload: { text: "Upload", color: "text-orange-400 border-orange-500/40 bg-orange-500/10" },
};

const AUTHOR_LABELS: Record<string, string> = {
	user: "User",
	manager: "Manager",
	agent: "Agent",
};

interface DocumentCardProps {
	title: string;
	type: string;
	tags: string[];
	snippet: string;
	createdBy: string;
	updatedAt: number;
	onClick: () => void;
}

function DocumentCard({
	title,
	type,
	tags,
	snippet,
	createdBy,
	updatedAt,
	onClick,
}: DocumentCardProps) {
	const typeBadge = TYPE_LABELS[type] ?? {
		text: type,
		color: "text-muted-foreground border-border",
	};
	const authorLabel = AUTHOR_LABELS[createdBy] ?? createdBy;
	const timeAgo = formatTimeAgo(updatedAt);

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"w-full text-left",
				"border-2 border-border bg-card p-3 shadow-pixel inset-shadow-pixel",
				"hover:-translate-x-px hover:-translate-y-px hover:shadow-pixel-hover hover:inset-shadow-pixel-hover hover:border-muted-foreground/40",
				"active:translate-x-px active:translate-y-px active:shadow-none active:inset-shadow-pressed",
				"transition-all",
			)}
		>
			<div className="mb-2 flex items-start justify-between gap-2">
				<h3 className="line-clamp-2 text-xs font-medium leading-snug text-foreground">{title}</h3>
				<span
					className={cn(
						"shrink-0 border-2 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest",
						typeBadge.color,
					)}
				>
					{typeBadge.text}
				</span>
			</div>

			{snippet && (
				<p className="mb-2 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
					{snippet}
				</p>
			)}

			{tags.length > 0 && (
				<div className="mb-2 flex flex-wrap gap-1">
					{tags.slice(0, 4).map((tag) => (
						<span
							key={tag}
							className="border-2 border-border bg-muted/50 px-1 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground"
						>
							{tag}
						</span>
					))}
					{tags.length > 4 && (
						<span className="px-1 py-0.5 font-mono text-[9px] text-muted-foreground">
							+{tags.length - 4}
						</span>
					)}
				</div>
			)}

			<div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
				<span>{authorLabel}</span>
				<span className="text-border">|</span>
				<span>{timeAgo}</span>
			</div>
		</button>
	);
}

function formatTimeAgo(timestamp: number): string {
	const seconds = Math.floor((Date.now() - timestamp) / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

export { DocumentCard as documentHubDocumentCard };
export type { DocumentCardProps as documentHubDocumentCardProps };
