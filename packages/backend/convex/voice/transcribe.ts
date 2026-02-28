"use node";

import { v } from "convex/values";

import { internalAction } from "../_generated/server";

const MISTRAL_TRANSCRIPTION_URL = "https://api.mistral.ai/v1/audio/transcriptions";

/** Transcribe audio using Voxtral (runs in Node.js for process.env access). */
export const transcribeAudio = internalAction({
	args: {
		audioBase64: v.string(),
		mimeType: v.string(),
	},
	handler: async (_ctx, { audioBase64, mimeType }) => {
		const mistralKey = process.env.MISTRAL_API_KEY;
		if (!mistralKey) {
			throw new Error("MISTRAL_API_KEY not configured");
		}

		const binaryStr = atob(audioBase64);
		const bytes = new Uint8Array(binaryStr.length);
		for (let i = 0; i < binaryStr.length; i++) {
			bytes[i] = binaryStr.charCodeAt(i);
		}
		const audioBlob = new Blob([bytes], { type: mimeType });

		const form = new FormData();
		form.set("model", "voxtral-mini-latest");
		form.set("file", audioBlob, "recording.webm");

		const res = await fetch(MISTRAL_TRANSCRIPTION_URL, {
			method: "POST",
			headers: { Authorization: `Bearer ${mistralKey}` },
			body: form,
		});

		if (!res.ok) {
			const err = await res.text();
			throw new Error(`Transcription failed (${res.status}): ${err}`);
		}

		const data = (await res.json()) as { text?: string };
		return data.text ?? "";
	},
});
