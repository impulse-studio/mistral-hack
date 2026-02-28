import * as React from "react";

import { cn } from "@/lib/utils";

const BLOCK = 4; // px per block
const GAP = 0; // px between blocks
const CELL = BLOCK + GAP; // 6px per cell
const MAX_BLOCKS = 8; // max stacked blocks per column
const MAX_HEIGHT = MAX_BLOCKS * CELL; // 48px

interface TranscriptionWaveformProps {
	analyser: AnalyserNode | null;
	muted?: boolean;
	bars?: number;
	/** Frequency values below this (0-255) are treated as silence. */
	threshold?: number;
	className?: string;
}

/** Build a sqrt-scale bin mapping — middle ground between log and linear. Starts at 200 Hz. */
function buildBinRanges(
	bars: number,
	bufferLength: number,
	sampleRate: number,
): Array<[number, number]> {
	const minFreq = 200;
	const maxFreq = Math.min(16_000, sampleRate / 2);
	const sqrtMin = Math.sqrt(minFreq);
	const sqrtMax = Math.sqrt(maxFreq);
	const hzPerBin = sampleRate / (bufferLength * 2);

	const ranges: Array<[number, number]> = [];
	for (let i = 0; i < bars; i++) {
		const freqLow = (sqrtMin + (sqrtMax - sqrtMin) * (i / bars)) ** 2;
		const freqHigh = (sqrtMin + (sqrtMax - sqrtMin) * ((i + 1) / bars)) ** 2;
		const binLow = Math.max(0, Math.floor(freqLow / hzPerBin));
		const binHigh = Math.min(bufferLength - 1, Math.ceil(freqHigh / hzPerBin));
		ranges.push([binLow, Math.max(binLow + 1, binHigh)]);
	}
	return ranges;
}

function TranscriptionWaveform({
	analyser,
	muted = false,
	bars = 32,
	threshold = 0,
	className,
}: TranscriptionWaveformProps) {
	const containerRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		if (!analyser || muted) return;

		const container = containerRef.current;
		if (!container) return;

		const bufferLength = analyser.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);
		const sampleRate = analyser.context.sampleRate;
		const ranges = buildBinRanges(bars, bufferLength, sampleRate);
		let rafId: number;

		function draw() {
			rafId = requestAnimationFrame(draw);
			analyser!.getByteFrequencyData(dataArray);

			const children = container!.children;
			for (let i = 0; i < children.length; i++) {
				const [start, end] = ranges[i];
				let sum = 0;
				for (let j = start; j < end; j++) {
					sum += dataArray[j];
				}
				const avg = sum / (end - start);
				const reduced = Math.max(0, avg - threshold) / Math.max(1, 255 - threshold);
				const blocks = Math.round(reduced * MAX_BLOCKS);
				(children[i] as HTMLElement).style.height = `${blocks * CELL}px`;
			}
		}

		rafId = requestAnimationFrame(draw);
		return () => cancelAnimationFrame(rafId);
	}, [analyser, muted, bars, threshold]);

	// Collapse bars when muted
	React.useEffect(() => {
		if (!muted) return;
		const container = containerRef.current;
		if (!container) return;
		for (const child of container.children) {
			(child as HTMLElement).style.height = "0px";
		}
	}, [muted]);

	const containerStyle = React.useMemo(() => ({ height: MAX_HEIGHT }), []);

	// Mistral gradient: red → orange → yellow, one color per column
	const barStyles = React.useMemo(() => {
		const stops = [
			[225, 5, 0], // #E10500
			[250, 80, 15], // #FA500F
			[255, 130, 5], // #FF8205
			[255, 175, 0], // #FFAF00
			[255, 216, 0], // #FFD800
		];

		return Array.from({ length: bars }, (_, i) => {
			const t = bars === 1 ? 0 : i / (bars - 1);
			const seg = t * (stops.length - 1);
			const idx = Math.min(Math.floor(seg), stops.length - 2);
			const frac = seg - idx;
			const r = Math.round(stops[idx][0] + (stops[idx + 1][0] - stops[idx][0]) * frac);
			const g = Math.round(stops[idx][1] + (stops[idx + 1][1] - stops[idx][1]) * frac);
			const b = Math.round(stops[idx][2] + (stops[idx + 1][2] - stops[idx][2]) * frac);
			const color = `rgb(${r},${g},${b})`;

			return {
				backgroundImage: `repeating-linear-gradient(to top, ${color} 0px, ${color} ${BLOCK}px, transparent ${BLOCK}px, transparent ${CELL}px)`,
				backgroundSize: `${BLOCK}px ${CELL}px`,
				backgroundRepeat: "repeat" as const,
				imageRendering: "pixelated" as const,
				height: "0px",
			};
		});
	}, [bars]);

	return (
		<div
			aria-hidden="true"
			className={cn(
				"flex items-end gap-[2px] transition-opacity duration-300",
				muted && "opacity-20",
				className,
			)}
			data-slot="pixel-waveform"
			ref={containerRef}
			style={containerStyle}
		>
			{barStyles.map((style, i) => (
				<div className="w-[4px]" key={i} style={style} />
			))}
		</div>
	);
}

export { TranscriptionWaveform, type TranscriptionWaveformProps };
