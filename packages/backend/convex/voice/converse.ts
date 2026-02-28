import { api, internal } from "../_generated/api";
import { httpAction } from "../_generated/server";

const MISTRAL_TRANSCRIPTION_URL = "https://api.mistral.ai/v1/audio/transcriptions";

/**
 * POST /voice/converse
 *
 * Unified voice conversation pipeline:
 *   1. Accept user audio (base64 JSON or multipart form-data)
 *   2. Transcribe with Voxtral
 *   3. Save transcript to agent thread + messages table
 *   4. Stream managerAgent response → ElevenLabs WebSocket TTS
 *   5. Return MP3 audio + metadata headers
 *
 * Query params:
 *   ?threadId=<id>  — reuse existing thread (created if omitted)
 */
export const converse = httpAction(async (ctx, request) => {
	const mistralKey = process.env.MISTRAL_API_KEY;

	const cors: Record<string, string> = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	};

	if (request.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: cors });
	}

	if (!mistralKey) {
		return jsonResponse({ error: "MISTRAL_API_KEY not configured" }, 500, cors);
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

		// --- 5. Stream LLM → ElevenLabs WebSocket TTS → collect audio ---
		const { text: reply, audioBase64 } = (await ctx.runAction(internal.chat.generateVoiceResponse, {
			threadId,
			promptMessageId: messageId,
		})) as { text: string; audioBase64: string };

		// --- 6. Return MP3 audio with metadata headers ---
		const audioBuffer = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));

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

	const binaryStr = atob(audio);
	const bytes = new Uint8Array(binaryStr.length);
	for (let i = 0; i < binaryStr.length; i++) {
		bytes[i] = binaryStr.charCodeAt(i);
	}
	return new Blob([bytes], { type: mimeType ?? "audio/webm" });
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

function jsonResponse(data: Record<string, unknown>, status: number, cors: Record<string, string>) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...cors, "Content-Type": "application/json" },
	});
}
