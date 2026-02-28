import { useMemo } from "react";

import { PixelText } from "@/lib/pixel";
import { cn } from "@/lib/utils";

import type { FileTreeNodeData } from "./FileTree.component";

interface FileTreeNodeProps {
	node: FileTreeNodeData;
	depth: number;
	expanded: Set<string>;
	onToggle: (path: string) => void;
	onSelect?: (path: string) => void;
	activeFile?: string;
	pathPrefix: string;
}

const languageDotColors: Record<string, string> = {
	ts: "text-cyan-400",
	tsx: "text-cyan-400",
	json: "text-yellow-400",
	md: "text-muted-foreground",
	css: "text-purple-400",
};

function getLanguageFromName(name: string): string | undefined {
	const ext = name.split(".").pop();
	return ext;
}

function getDotColor(node: FileTreeNodeData): string {
	if (node.type === "directory") return "text-orange-400";
	const lang = node.language ?? getLanguageFromName(node.name);
	if (lang && lang in languageDotColors) return languageDotColors[lang];
	return "text-muted-foreground";
}

function FileTreeNode({
	node,
	depth,
	expanded,
	onToggle,
	onSelect,
	activeFile,
	pathPrefix,
}: FileTreeNodeProps) {
	const isDir = node.type === "directory";
	const isExpanded = expanded.has(pathPrefix);
	const isActive = activeFile === pathPrefix;
	const indentStyle = useMemo(() => ({ paddingLeft: depth * 12 + 8 }), [depth]);

	const handleClick = () => {
		if (isDir) {
			onToggle(pathPrefix);
		} else {
			onSelect?.(pathPrefix);
		}
	};

	return (
		<>
			<button
				type="button"
				className={cn(
					"flex w-full items-center gap-1.5 px-2 py-0.5 hover:bg-white/5 cursor-pointer",
					isActive && "bg-accent/20",
				)}
				style={indentStyle}
				onClick={handleClick}
			>
				{/* Expand arrow for directories, spacer for files */}
				{isDir ? (
					<span className="text-muted-foreground text-[10px] w-3 shrink-0 text-center select-none">
						{isExpanded ? "▼" : "▶"}
					</span>
				) : (
					<span className="w-3 shrink-0" />
				)}

				{/* Colored dot */}
				<span className={cn("text-[10px] leading-none select-none", getDotColor(node))}>●</span>

				{/* Name */}
				<PixelText variant="code" className={cn(isDir && "font-semibold", !isDir && "font-normal")}>
					{node.name}
				</PixelText>
			</button>

			{/* Recursively render children when expanded */}
			{isDir &&
				isExpanded &&
				node.children?.map((child) => (
					<FileTreeNode
						key={child.name}
						node={child}
						depth={depth + 1}
						expanded={expanded}
						onToggle={onToggle}
						onSelect={onSelect}
						activeFile={activeFile}
						pathPrefix={`${pathPrefix}/${child.name}`}
					/>
				))}
		</>
	);
}

export { FileTreeNode };
