import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { documentHubDocumentCard as DocumentCard } from "./DocumentCard";

const TYPE_FILTERS = [
	{ value: undefined, label: "All" },
	{ value: "note" as const, label: "Notes" },
	{ value: "reference" as const, label: "Reference" },
	{ value: "code_doc" as const, label: "Code Docs" },
	{ value: "upload" as const, label: "Uploads" },
];

interface DocumentHubDocument {
	id: string;
	title: string;
	type: string;
	tags: string[];
	content?: string;
	createdBy: string;
	updatedAt: number;
}

interface DocumentHubProps {
	documents: DocumentHubDocument[];
	searchQuery: string;
	onSearchChange: (query: string) => void;
	typeFilter?: string;
	onTypeFilterChange: (type: string | undefined) => void;
	onDocumentClick: (id: string) => void;
	onCreateClick: () => void;
	onUploadClick: () => void;
	isLoading: boolean;
}

function DocumentHub({
	documents,
	searchQuery,
	onSearchChange,
	typeFilter,
	onTypeFilterChange,
	onDocumentClick,
	onCreateClick,
	onUploadClick,
	isLoading,
}: DocumentHubProps) {
	return (
		<div className="flex h-full flex-col gap-3 overflow-hidden p-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="font-mono text-sm font-semibold uppercase tracking-widest">Document Hub</h1>
				<div className="flex gap-2">
					<Button variant="elevated" size="sm" onClick={onUploadClick}>
						<span className="font-mono text-[11px] font-semibold uppercase tracking-widest">
							Upload
						</span>
					</Button>
					<Button variant="accent" size="sm" onClick={onCreateClick}>
						<span className="font-mono text-[11px] font-semibold uppercase tracking-widest">
							+ New Doc
						</span>
					</Button>
				</div>
			</div>

			{/* Search + filter bar */}
			<div className="flex gap-2">
				<Input
					placeholder="Search documents..."
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					className="max-w-xs"
				/>
				<div className="flex gap-1">
					{TYPE_FILTERS.map((f) => (
						<button
							key={f.label}
							type="button"
							onClick={() => onTypeFilterChange(f.value)}
							className={cn(
								"border-2 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest transition-all",
								typeFilter === f.value
									? "border-brand-accent bg-brand-accent/10 text-brand-accent"
									: "border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground",
							)}
						>
							{f.label}
						</button>
					))}
				</div>
			</div>

			{/* Document grid */}
			<div className="flex-1 overflow-y-auto">
				{isLoading ? (
					<div className="border-2 border-border bg-card px-4 py-3 shadow-pixel inset-shadow-pixel">
						<span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
							Loading documents...
						</span>
					</div>
				) : documents.length === 0 ? (
					<div className="border-2 border-dashed border-border bg-card/50 px-6 py-8 text-center">
						<p className="mb-1 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
							No documents yet
						</p>
						<p className="text-[11px] text-muted-foreground">
							Create a document or ask an agent to save research to the Doc Hub.
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{documents.map((doc) => (
							<DocumentCard
								key={doc.id}
								title={doc.title}
								type={doc.type}
								tags={doc.tags}
								snippet={doc.content?.slice(0, 200) ?? ""}
								createdBy={doc.createdBy}
								updatedAt={doc.updatedAt}
								onClick={() => onDocumentClick(doc.id)}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

export { DocumentHub };
export type { DocumentHubProps, DocumentHubDocument };
