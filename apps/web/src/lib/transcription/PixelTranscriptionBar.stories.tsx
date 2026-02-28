import type { Meta, StoryObj } from "@storybook/react-vite";
import { useCallback, useEffect, useRef, useState } from "react";

import { TranscriptionBar } from "./PixelTranscriptionBar.component";

const meta = {
	title: "features/TranscriptionBar",
	component: TranscriptionBar,
	decorators: [
		(Story) => (
			<div className="flex w-[480px] items-end justify-center bg-background p-6">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof TranscriptionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {
	args: {
		active: true,
		muted: false,
		elapsed: 73,
		analyser: null,
		className: "w-full",
		onMutedChange: () => {},
		onStop: () => {},
	},
};

export const Muted: Story = {
	args: {
		active: true,
		muted: true,
		elapsed: 142,
		analyser: null,
		className: "w-full",
		onMutedChange: () => {},
		onStop: () => {},
	},
};

export const Inactive: Story = {
	args: {
		active: false,
		muted: false,
		elapsed: 0,
		analyser: null,
		className: "w-full",
		onMutedChange: () => {},
		onStop: () => {},
	},
};

export const LiveMic: Story = {
	args: {
		active: false,
		muted: false,
		elapsed: 0,
		analyser: null,
		className: "w-full",
		onMutedChange: () => {},
		onStop: () => {},
	},
	render: function LiveMicStory() {
		const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
		const [muted, setMuted] = useState(false);
		const [elapsed, setElapsed] = useState(0);
		const streamRef = useRef<MediaStream | null>(null);
		const ctxRef = useRef<AudioContext | null>(null);

		const start = useCallback(async () => {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;
			const ctx = new AudioContext();
			ctxRef.current = ctx;
			const source = ctx.createMediaStreamSource(stream);
			const node = ctx.createAnalyser();
			node.fftSize = 256;
			source.connect(node);
			setAnalyser(node);
		}, []);

		const stop = useCallback(() => {
			streamRef.current?.getTracks().forEach((t) => t.stop());
			ctxRef.current?.close();
			setAnalyser(null);
			setElapsed(0);
		}, []);

		useEffect(() => {
			if (!analyser) return;
			const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
			return () => clearInterval(interval);
		}, [analyser]);

		if (!analyser) {
			return (
				<button
					className="border-2 border-border bg-card px-4 py-2 font-mono text-sm uppercase tracking-widest text-foreground shadow-pixel hover:-translate-x-px hover:-translate-y-px hover:shadow-pixel-hover active:translate-x-px active:translate-y-px active:inset-shadow-pressed"
					onClick={start}
					type="button"
				>
					Start Mic
				</button>
			);
		}

		return (
			<TranscriptionBar
				active
				analyser={analyser}
				className="w-full"
				elapsed={elapsed}
				muted={muted}
				onMutedChange={setMuted}
				onStop={stop}
			/>
		);
	},
};
