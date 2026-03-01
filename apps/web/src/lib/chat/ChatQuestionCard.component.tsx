import { api } from "@mistral-hack/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import type { GenericId } from "convex/values";
import { useCallback, useState } from "react";

import { PixelBadge } from "@/lib/pixel/PixelBadge";
import { PixelBorderBox } from "@/lib/pixel/PixelBorderBox";
import { PixelText } from "@/lib/pixel/PixelText";
import { cn } from "@/lib/utils";

interface ChatQuestionOption {
	label: string;
	description: string;
}

interface ChatQuestionItem {
	question: string;
	header: string;
	options: ChatQuestionOption[];
	multiSelect: boolean;
}

interface ChatQuestionCardProps {
	questionId: GenericId<"userQuestions">;
	questions: ChatQuestionItem[];
}

function ChatQuestionCard({ questionId, questions }: ChatQuestionCardProps) {
	const answerMutation = useMutation(api.userQuestions.mutations.answer);
	const dismissMutation = useMutation(api.userQuestions.mutations.dismiss);

	// Per-question selection state: selectedLabels + optional customText
	const [selections, setSelections] = useState<
		Array<{ selectedLabels: Set<string>; customText: string; showOther: boolean }>
	>(() =>
		questions.map(() => ({
			selectedLabels: new Set<string>(),
			customText: "",
			showOther: false,
		})),
	);
	const [chatQuestionCardIsSubmitting, setChatQuestionCardIsSubmitting] = useState(false);

	const chatQuestionCardToggleOption = useCallback(
		(qIndex: number, label: string) => {
			setSelections((prev) => {
				const next = [...prev];
				const item = { ...next[qIndex]! };
				const labels = new Set(item.selectedLabels);

				if (questions[qIndex]!.multiSelect) {
					if (labels.has(label)) labels.delete(label);
					else labels.add(label);
				} else {
					// Single-select: clear others
					labels.clear();
					labels.add(label);
					item.showOther = false;
					item.customText = "";
				}

				item.selectedLabels = labels;
				next[qIndex] = item;
				return next;
			});
		},
		[questions],
	);

	const chatQuestionCardToggleOther = useCallback(
		(qIndex: number) => {
			setSelections((prev) => {
				const next = [...prev];
				const item = { ...next[qIndex]! };

				if (!questions[qIndex]!.multiSelect) {
					// Single-select: clear label selections when choosing Other
					item.selectedLabels = new Set<string>();
				}

				item.showOther = !item.showOther;
				if (!item.showOther) item.customText = "";
				next[qIndex] = item;
				return next;
			});
		},
		[questions],
	);

	const chatQuestionCardSetCustomText = useCallback((qIndex: number, text: string) => {
		setSelections((prev) => {
			const next = [...prev];
			next[qIndex] = { ...next[qIndex]!, customText: text };
			return next;
		});
	}, []);

	const chatQuestionCardHandleSubmit = useCallback(async () => {
		setChatQuestionCardIsSubmitting(true);
		try {
			const answers = selections.map((s) => ({
				selectedLabels: [...s.selectedLabels],
				customText: s.customText || undefined,
			}));
			await answerMutation({ questionId, answers });
		} finally {
			setChatQuestionCardIsSubmitting(false);
		}
	}, [selections, answerMutation, questionId]);

	const chatQuestionCardHandleDismiss = useCallback(async () => {
		await dismissMutation({ questionId });
	}, [dismissMutation, questionId]);

	const chatQuestionCardHasAnswer = selections.some(
		(s) => s.selectedLabels.size > 0 || s.customText.trim().length > 0,
	);

	return (
		<PixelBorderBox elevation="floating" className="mx-2 mb-2 p-3 space-y-3">
			{/* Dismiss button */}
			<div className="flex items-center justify-between">
				<PixelText variant="label" color="muted">
					Manager is asking...
				</PixelText>
				<button
					type="button"
					onClick={chatQuestionCardHandleDismiss}
					className="text-muted-foreground hover:text-foreground font-mono text-xs px-1"
				>
					X
				</button>
			</div>

			{questions.map((q, qIndex) => (
				<div key={q.header} className="space-y-1.5">
					{/* Header + question text */}
					<div className="flex items-center gap-2">
						<PixelBadge color="orange" size="sm">
							{q.header}
						</PixelBadge>
						{q.multiSelect && (
							<PixelText variant="id" color="muted">
								(select multiple)
							</PixelText>
						)}
					</div>
					<PixelText variant="body">{q.question}</PixelText>

					{/* Option chips */}
					<div className="flex flex-wrap gap-1.5">
						{q.options.map((opt) => {
							const isSelected = selections[qIndex]!.selectedLabels.has(opt.label);
							return (
								<button
									key={opt.label}
									type="button"
									onClick={() => chatQuestionCardToggleOption(qIndex, opt.label)}
									title={opt.description}
									className={cn(
										"border px-2 py-1 font-mono text-[11px] transition-colors",
										isSelected
											? "border-orange-500 bg-orange-500/20 text-orange-400"
											: "border-border bg-card text-muted-foreground hover:border-muted-foreground/40",
									)}
								>
									{opt.label}
								</button>
							);
						})}

						{/* Other option */}
						<button
							type="button"
							onClick={() => chatQuestionCardToggleOther(qIndex)}
							className={cn(
								"border px-2 py-1 font-mono text-[11px] transition-colors",
								selections[qIndex]!.showOther
									? "border-purple-500 bg-purple-500/20 text-purple-400"
									: "border-border bg-card text-muted-foreground hover:border-muted-foreground/40",
							)}
						>
							Other...
						</button>
					</div>

					{/* Other text input */}
					{selections[qIndex]!.showOther && (
						<input
							type="text"
							placeholder="Type your answer..."
							value={selections[qIndex]!.customText}
							onChange={(e) => chatQuestionCardSetCustomText(qIndex, e.target.value)}
							className="w-full border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:border-purple-500 focus:outline-none"
						/>
					)}
				</div>
			))}

			{/* Submit */}
			<button
				type="button"
				onClick={chatQuestionCardHandleSubmit}
				disabled={!chatQuestionCardHasAnswer || chatQuestionCardIsSubmitting}
				className={cn(
					"w-full border-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest transition-colors",
					chatQuestionCardHasAnswer && !chatQuestionCardIsSubmitting
						? "border-orange-500 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
						: "border-border bg-muted text-muted-foreground cursor-not-allowed",
				)}
			>
				{chatQuestionCardIsSubmitting ? "Sending..." : "Submit Answer"}
			</button>
		</PixelBorderBox>
	);
}

export { ChatQuestionCard };
export type { ChatQuestionCardProps, ChatQuestionItem };
