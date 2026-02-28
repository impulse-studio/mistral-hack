import { api, internal } from "../_generated/api";
import { httpAction } from "../_generated/server";

/**
 * POST /voice/converse
 *
 * Unified voice conversation pipeline:
 *   1. Accept user audio (base64 JSON or multipart form-data)
 *   2. Transcribe with Voxtral (via Node.js action)
 *   3. Save transcript to agent thread + messages table
 *   4. Stream managerAgent response → ElevenLabs WebSocket TTS
 *   5. Return MP3 audio + metadata headers
 *
 * Query params:
 *   ?threadId=<id>  — reuse existing thread (created if omitted)
 */
export const converse = httpAction(async (ctx, request) => {
	const cors: Record<string, string> = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	};

	if (request.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: cors });
	}

	try {
		// --- 1. Parse incoming audio ---
		const audioBase64 = await extractAudioBase64(request);
		if (!audioBase64) {
			return jsonResponse({ error: "No audio provided" }, 400, cors);
		}

		// --- 2. Transcribe with Voxtral (runs in Node.js action) ---
		const transcript: string = await ctx.runAction(internal.voice.transcribe.transcribeAudio, {
			audioBase64: audioBase64.data,
			mimeType: audioBase64.mimeType,
		});
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
		const { text: reply, audioBase64: responseAudio } = (await ctx.runAction(
			internal.voice.generate.generateVoiceResponse,
			{
				threadId,
				promptMessageId: messageId,
			},
		)) as { text: string; audioBase64: string };

		// --- 6. Return MP3 audio with metadata headers ---
		const audioBuffer = Uint8Array.from(atob(responseAudio), (c) => c.charCodeAt(0));

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

async function extractAudioBase64(
	request: Request,
): Promise<{ data: string; mimeType: string } | null> {
	const contentType = request.headers.get("content-type") ?? "";

	if (contentType.includes("multipart/form-data")) {
		const form = await request.formData();
		const file = form.get("file");
		if (file instanceof Blob) {
			const buffer = await file.arrayBuffer();
			const bytes = new Uint8Array(buffer);
			let binary = "";
			for (let i = 0; i < bytes.length; i++) {
				binary += String.fromCharCode(bytes[i]);
			}
			return { data: btoa(binary), mimeType: file.type || "audio/webm" };
		}
		return null;
	}

	const body = await request.json();
	const { audio, mimeType } = body as {
		audio?: string;
		mimeType?: string;
	};
	if (!audio) return null;

	return { data: audio, mimeType: mimeType ?? "audio/webm" };
}

function jsonResponse(data: Record<string, unknown>, status: number, cors: Record<string, string>) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...cors, "Content-Type": "application/json" },
	});
}
