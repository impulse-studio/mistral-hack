import { useState } from "react";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GamesSnakeGame } from "@/lib/games/snake/SnakeGame.component";
import { GamesTetrisTetrisGame } from "@/lib/games/tetris/TetrisGame.component";

type GameId = "snake" | "tetris";

interface GameArcadeModalProps {
	open: boolean;
	onClose: () => void;
}

const GAMES: Array<{ id: GameId; label: string; icon: string }> = [
	{ id: "snake", label: "Snake", icon: "🐍" },
	{ id: "tetris", label: "Tetris", icon: "🧱" },
];

export function GamesGameArcadeModal({ open, onClose }: GameArcadeModalProps) {
	const [activeGame, setActiveGame] = useState<GameId | null>(null);

	const handleOpenChange = (next: boolean) => {
		if (!next) {
			setActiveGame(null);
			onClose();
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="flex max-h-[90vh] w-auto max-w-[90vw] flex-col items-center">
				<DialogHeader>
					<DialogTitle className="font-mono text-xs uppercase tracking-widest">
						Arcade Table
					</DialogTitle>
					<DialogClose render={<Button variant="default" size="icon-sm" />}>×</DialogClose>
				</DialogHeader>

				{!activeGame && (
					<div className="flex gap-4 p-6">
						{GAMES.map((g) => (
							<button
								key={g.id}
								type="button"
								onClick={() => setActiveGame(g.id)}
								className="flex flex-col items-center gap-2 rounded border-2 border-border bg-card px-8 py-6 font-mono transition-colors hover:border-brand-accent hover:bg-accent shadow-pixel"
							>
								<span className="text-3xl">{g.icon}</span>
								<span className="text-xs font-semibold uppercase tracking-widest text-foreground">
									{g.label}
								</span>
							</button>
						))}
					</div>
				)}

				{activeGame && (
					<div className="flex flex-col items-center gap-3 p-4">
						<div className="flex items-center gap-2">
							<Button
								variant="default"
								size="sm"
								onClick={() => setActiveGame(null)}
								className="font-mono text-[9px] uppercase tracking-widest"
							>
								← Back
							</Button>
						</div>
						{activeGame === "snake" && <GamesSnakeGame />}
						{activeGame === "tetris" && <GamesTetrisTetrisGame />}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
