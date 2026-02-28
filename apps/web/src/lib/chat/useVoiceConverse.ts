import { env } from "@mistral-hack/env/web";
import { useCallback, useRef, useState } from "react";

interface UseVoiceConverseOptions {
	threadId: string | null;
	/** Called to create a thread if none exists (must return threadId). */
	ensureThreadId: () => Promise<string>;
}

interface UseVoiceConverseReturn {
	/** Start recording from the mic. Returns an AnalyserNode for waveform viz. */
	voiceConverseStartRecording: () => Promise<AnalyserNode | null>;
	/** Stop recording and send audio to /voice/converse. */
	voiceConverseStopAndSend: () => void;
	/** Cancel recording without sending. */
	voiceConverseCancel: () => void;
	/** True while recording mic audio. */
	voiceConverseIsRecording: boolean;
	/** True while waiting for backend response. */
	voiceConverseIsProcessing: boolean;
}

function useVoiceConverse({
	threadId,
	ensureThreadId,
}: UseVoiceConverseOptions): UseVoiceConverseReturn {
	const [voiceConverseIsRecording, setVoiceConverseIsRecording] = useState(false);
	const [voiceConverseIsProcessing, setVoiceConverseIsProcessing] = useState(false);

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioChunksRef = useRef<Blob[]>([]);
	const streamRef = useRef<MediaStream | null>(null);
	const audioCtxRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);

	const cleanup = useCallback(() => {
		streamRef.current?.getTracks().forEach((t) => t.stop());
		audioCtxRef.current?.close();
		mediaRecorderRef.current = null;
		audioChunksRef.current = [];
		streamRef.current = null;
		audioCtxRef.current = null;
		analyserRef.current = null;
		setVoiceConverseIsRecording(false);
	}, []);

	const voiceConverseStartRecording = useCallback(async (): Promise<AnalyserNode | null> => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;

			// Audio context + analyser for waveform visualization
			const ctx = new AudioContext();
			audioCtxRef.current = ctx;
			const source = ctx.createMediaStreamSource(stream);
			const analyser = ctx.createAnalyser();
			analyser.fftSize = 256;
			source.connect(analyser);
			analyserRef.current = analyser;

			// MediaRecorder to capture audio data
			const recorder = new MediaRecorder(stream, {
				mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
					? "audio/webm;codecs=opus"
					: "audio/webm",
			});
			mediaRecorderRef.current = recorder;
			audioChunksRef.current = [];

			recorder.ondataavailable = (e) => {
				if (e.data.size > 0) {
					audioChunksRef.current.push(e.data);
				}
			};

			recorder.start();
			setVoiceConverseIsRecording(true);
			return analyser;
		} catch (err) {
			console.error("Failed to start voice recording:", err);
			cleanup();
			return null;
		}
	}, [cleanup]);

	const sendAudio = useCallback(
		async (audioBlob: Blob) => {
			setVoiceConverseIsProcessing(true);
			try {
				// Ensure thread exists BEFORE sending so the subscription is
				// already watching — user transcript appears via Convex reactivity
				// as soon as saveUserMessage commits on the backend.
				const activeThreadId = threadId ?? (await ensureThreadId());

				// Convert blob to base64
				const buffer = await audioBlob.arrayBuffer();
				const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

				const siteUrl = env.VITE_CONVEX_SITE_URL;

				const res = await fetch(`${siteUrl}/voice/converse?threadId=${activeThreadId}`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						audio: base64,
						mimeType: audioBlob.type,
					}),
				});

				if (!res.ok) {
					const err = await res.json().catch(() => ({ error: res.statusText }));
					console.error("Voice converse failed:", err);
					return;
				}

				// 1-second delay before playing audio so the user sees their
				// transcribed text appear in the chat first.
				await new Promise<void>((resolve) => {
					setTimeout(resolve, 1000);
				});

				// Play back audio response
				const audioData = await res.arrayBuffer();
				const audioCtx = new AudioContext();
				const audioBuffer = await audioCtx.decodeAudioData(audioData);
				const source = audioCtx.createBufferSource();
				source.buffer = audioBuffer;
				source.connect(audioCtx.destination);
				source.start();
				source.addEventListener("ended", () => audioCtx.close());
			} catch (err) {
				console.error("Voice converse error:", err);
			} finally {
				setVoiceConverseIsProcessing(false);
			}
		},
		[threadId, ensureThreadId],
	);

	const voiceConverseStopAndSend = useCallback(() => {
		const recorder = mediaRecorderRef.current;
		if (!recorder || recorder.state === "inactive") {
			cleanup();
			return;
		}

		recorder.onstop = () => {
			const blob = new Blob(audioChunksRef.current, {
				type: recorder.mimeType,
			});
			cleanup();
			if (blob.size > 0) {
				sendAudio(blob);
			}
		};

		recorder.stop();
	}, [cleanup, sendAudio]);

	const voiceConverseCancel = useCallback(() => {
		const recorder = mediaRecorderRef.current;
		if (recorder && recorder.state !== "inactive") {
			recorder.stop();
		}
		cleanup();
	}, [cleanup]);

	return {
		voiceConverseStartRecording,
		voiceConverseStopAndSend,
		voiceConverseCancel,
		voiceConverseIsRecording,
		voiceConverseIsProcessing,
	};
}

export { useVoiceConverse as chatUseVoiceConverse };
export type { UseVoiceConverseReturn as ChatUseVoiceConverseReturn };
