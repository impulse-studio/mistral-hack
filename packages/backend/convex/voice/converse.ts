"use node";

import { api, internal } from "../_generated/api";
import { httpAction } from "../_generated/server";

const MISTRAL_TRANSCRIPTION_URL = "https://api.mistral.ai/v1/audio/transcriptions";
const ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech";

/**
 * POST /voice/converse
 *
 * Unified voice conversation — goes through the same managerAgent + thread
 * system as text chat:
 *   1. Accept user audio (base64 JSON or multipart form-data)
 *   2. Transcribe with Voxtral
 *   3. Save transcript to agent thread + messages table
 *   4. Run managerAgent.generateText → get reply
 *   5. TTS reply with ElevenLabs
 *   6. Return audio + metadata headers
 *
 * Required query param: ?threadId=<id>
 * If no threadId, a new thread is created.
 */
export const converse = httpAction(async (ctx, request) => {
	const mistralKey = process.env.MISTRAL_API_KEY;
	const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
	const voiceId = process.env.ELEVENLABS_VOICE_ID ?? "JBFqnCBsd6RMkjVDRZzb";

	const cors: Record<string, string> = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	};

	if (request.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: cors });
	}

	if (!mistralKey || !elevenLabsKey) {
		return jsonResponse(
			{ error: "MISTRAL_API_KEY and ELEVENLABS_API_KEY must be configured" },
			500,
			cors,
		);
	}

	try {
		// --- 1. Parse incoming audio ---
		const audioBlob = await extractAudio(request);
		if (!audioBlob) {
			return jsonResponse({ error: "No audio provided" }, 400, cors);
		}

		// --- 2. Transcribe with Voxtral ---
		const transcript = await transcribe(audioBlob, mistralKey);
		if (!transcript.trim()) {
			return jsonResponse({ error: "Empty transcription" }, 400, cors);
		}

		// --- 3. Get or create thread ---
		const url = new URL(request.url);
		let threadId = url.searchParams.get("threadId");
		if (!threadId) {
			threadId = await ctx.runMutation(api.chat.createNewThread, {});
		}

		// --- 4. Save user message to agent thread + messages table ---
		const messageId: string = await ctx.runMutation(api.chat.saveUserMessage, {
			threadId,
			prompt: transcript,
			channel: "web",
		});

		// --- 5. Run managerAgent → get reply text ---
		const reply: string = await ctx.runAction(internal.chat.generateTextResponse, {
			threadId,
			promptMessageId: messageId,
		});

		// --- 6. TTS with ElevenLabs ---
		const audioBuffer = await textToSpeech(reply, elevenLabsKey, voiceId);

		// --- 7. Return audio with metadata ---
		return new Response(audioBuffer, {
			status: 200,
			headers: {
				...cors,
				"Content-Type": "audio/mpeg",
				"X-Thread-Id": threadId,
				"X-Transcript": encodeURIComponent(transcript),
				"X-Reply": encodeURIComponent(reply),
				"Access-Control-Expose-Headers": "X-Thread-Id, X-Transcript, X-Reply",
			},
		});
	} catch (err) {
		console.error("Converse error:", err);
		return jsonResponse({ error: "Conversation failed", details: String(err) }, 500, cors);
	}
});

// ── Helpers ──────────────────────────────────────────────

async function extractAudio(request: Request): Promise<Blob | null> {
	const contentType = request.headers.get("content-type") ?? "";

	if (contentType.includes("multipart/form-data")) {
		const form = await request.formData();
		const file = form.get("file");
		if (file instanceof Blob) return file;
		return null;
	}

	const body = await request.json();
	const { audio, mimeType } = body as {
		audio?: string;
		mimeType?: string;
	};
	if (!audio) return null;

	const buffer = Buffer.from(audio, "base64");
	return new Blob([buffer], { type: mimeType ?? "audio/webm" });
}

async function transcribe(audio: Blob, apiKey: string): Promise<string> {
	const form = new FormData();
	form.set("model", "voxtral-mini-latest");
	form.set("file", audio, "recording.webm");

	const res = await fetch(MISTRAL_TRANSCRIPTION_URL, {
		method: "POST",
		headers: { Authorization: `Bearer ${apiKey}` },
		body: form,
	});

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`Transcription failed (${res.status}): ${err}`);
	}

	const data = (await res.json()) as { text?: string };
	return data.text ?? "";
}

async function textToSpeech(text: string, apiKey: string, voiceId: string): Promise<ArrayBuffer> {
	const res = await fetch(`${ELEVENLABS_TTS_URL}/${voiceId}?output_format=mp3_44100_128`, {
		method: "POST",
		headers: {
			"xi-api-key": apiKey,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			text,
			model_id: "eleven_multilingual_v2",
		}),
	});

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`TTS failed (${res.status}): ${err}`);
	}

	return res.arrayBuffer();
}

function jsonResponse(data: Record<string, unknown>, status: number, cors: Record<string, string>) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...cors, "Content-Type": "application/json" },
	});
}
