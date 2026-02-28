"use node";

import { WebSocket } from "ws";

const ELEVENLABS_WS_URL = "wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input";

/**
 * Pipe an async text stream into ElevenLabs WebSocket TTS.
 * Returns all audio chunks concatenated as a single base64 string.
 *
 * Protocol:
 *   1. Connect to WebSocket
 *   2. Send BOS (beginning of stream) with voice settings
 *   3. Send text chunks as they arrive from LLM
 *   4. Flush + send EOS (end of stream)
 *   5. Collect audio chunks, resolve when done
 */
export async function streamToSpeech(
	textStream: AsyncIterable<string>,
	apiKey: string,
	voiceId: string,
): Promise<string> {
	const wsUrl = ELEVENLABS_WS_URL.replace("{voice_id}", voiceId);

	return new Promise<string>((resolve, reject) => {
		const audioChunks: Buffer[] = [];

		const ws = new WebSocket(`${wsUrl}?model_id=eleven_flash_v2_5&output_format=mp3_44100_128`, {
			headers: { "xi-api-key": apiKey },
		});

		ws.on("error", (err) => reject(err));

		ws.on("open", () => {
			// BOS — begin stream with voice settings
			ws.send(
				JSON.stringify({
					text: " ",
					voice_settings: {
						stability: 0.5,
						similarity_boost: 0.8,
					},
					generation_config: {
						chunk_length_schedule: [120, 160, 250, 290],
					},
				}),
			);

			// Start piping LLM text chunks
			(async () => {
				try {
					for await (const chunk of textStream) {
						if (chunk) {
							ws.send(JSON.stringify({ text: chunk }));
						}
					}
					// Flush remaining buffered text
					ws.send(JSON.stringify({ text: " ", flush: true }));
					// EOS — end stream
					ws.send(JSON.stringify({ text: "" }));
				} catch (err) {
					ws.close();
					reject(err);
				}
			})();
		});

		ws.on("message", (data) => {
			try {
				const msg = JSON.parse(data.toString());
				if (msg.audio) {
					audioChunks.push(Buffer.from(msg.audio, "base64"));
				}
			} catch {
				// Non-JSON message, ignore
			}
		});

		ws.on("close", () => {
			if (audioChunks.length === 0) {
				reject(new Error("ElevenLabs WebSocket closed with no audio"));
				return;
			}
			const combined = Buffer.concat(audioChunks);
			resolve(combined.toString("base64"));
		});
	});
}
