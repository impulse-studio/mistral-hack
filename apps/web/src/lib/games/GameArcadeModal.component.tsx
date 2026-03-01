import { useState } from "react";

import { ChevronLeft } from "pixelarticons/react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { DIALOG_CLOSE_BUTTON_GHOST, PIXELATED_STYLE } from "@/components/ui/modal-close-buttons";
import { PixelText } from "@/lib/pixel/PixelText";
import { GamesSnakeGame } from "@/lib/games/snake/SnakeGame.component";
import { GamesTetrisTetrisGame } from "@/lib/games/tetris/TetrisGame.component";
import { GamesPongGame } from "@/lib/games/pong/PongGame.component";

type GameId = "snake" | "tetris" | "pong";

interface GameArcadeModalProps {
	open: boolean;
	onClose: () => void;
}

const GAMES: Array<{ id: GameId; label: string; icon: string }> = [
	{ id: "snake", label: "Snake", icon: "🐍" },
	{ id: "tetris", label: "Tetris", icon: "🧱" },
	{ id: "pong", label: "Pong", icon: "🏓" },
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
			<DialogContent className="flex max-h-[90vh] w-auto max-w-[90vw] flex-col items-center p-0">
				{/* ── Header ─────────────────────────────── */}
				<div className="flex w-full items-center justify-between border-b-2 border-border px-4 py-3">
					{activeGame ? (
						<Button
							variant="ghost"
							size="icon-xs"
							onClick={() => setActiveGame(null)}
							className="border-2 border-border bg-card"
						>
							<ChevronLeft className="size-4" style={PIXELATED_STYLE} />
						</Button>
					) : (
						<span className="size-6" />
					)}

					<PixelText as="h2" variant="heading">
						Arcade Table
					</PixelText>

					<DialogClose render={DIALOG_CLOSE_BUTTON_GHOST}>&times;</DialogClose>
				</div>

				{/* ── Game selector grid ──────────────────── */}
				{!activeGame && (
					<div className="flex gap-4 p-6">
						{GAMES.map((g) => (
							<button
								key={g.id}
								type="button"
								onClick={() => setActiveGame(g.id)}
								className="flex flex-col items-center gap-3 border-2 border-border bg-card px-8 py-6 shadow-pixel inset-shadow-pixel transition-transform hover:-translate-x-px hover:-translate-y-px hover:shadow-pixel-hover hover:inset-shadow-pixel-hover hover:border-muted-foreground/40 active:translate-x-px active:translate-y-px active:shadow-none active:inset-shadow-pressed"
							>
								<span className="text-3xl">{g.icon}</span>
								<PixelText variant="label">{g.label}</PixelText>
							</button>
						))}
					</div>
				)}

				{/* ── Active game ─────────────────────────── */}
				{activeGame && (
					<div className="flex flex-col items-center gap-3 p-4">
						{activeGame === "snake" && <GamesSnakeGame />}
						{activeGame === "tetris" && <GamesTetrisTetrisGame />}
						{activeGame === "pong" && <GamesPongGame />}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
