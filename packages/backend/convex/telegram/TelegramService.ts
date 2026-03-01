"use node";

/**
 * TelegramService — clean wrapper around the Telegram Bot API.
 *
 * No SDK, no Chat adapter — just direct HTTPS calls via `fetch`.
 */
export class TelegramService {
	private readonly baseUrl: string;

	constructor(token: string, baseUrl = "https://api.telegram.org") {
		if (!token) throw new Error("[TelegramService] Missing bot token");
		this.baseUrl = `${baseUrl}/bot${token}`;
	}

	// ── Send helpers ─────────────────────────────────────────

	/** Send a plain-text message. */
	async sendMessage(chatId: number | string, text: string): Promise<void> {
		await this.call("sendMessage", {
			chat_id: chatId,
			text,
			parse_mode: "Markdown",
		});
	}

	/** Send a "typing…" indicator. */
	async sendTyping(chatId: number | string): Promise<void> {
		await this.call("sendChatAction", {
			chat_id: chatId,
			action: "typing",
		});
	}

	// ── Update parsing ───────────────────────────────────────

	/** Extract a handleable message from a raw Telegram update. */
	static parseUpdate(body: Record<string, unknown>): TelegramMessage | null {
		// Regular message
		const msg = body.message as Record<string, unknown> | undefined;
		if (msg) return TelegramService.parseMessage(msg);

		// Edited message
		const edited = body.edited_message as Record<string, unknown> | undefined;
		if (edited) return TelegramService.parseMessage(edited);

		return null;
	}

	private static parseMessage(msg: Record<string, unknown>): TelegramMessage | null {
		const chat = msg.chat as { id: number; type: string } | undefined;
		if (!chat) return null;

		const from = msg.from as
			| {
					id: number;
					first_name?: string;
					last_name?: string;
					username?: string;
			  }
			| undefined;

		const text = (msg.text as string) ?? "";
		const entities = (msg.entities as TelegramEntity[]) ?? [];

		// Detect if this is a mention of our bot
		const isMention = entities.some(
			(e) => e.type === "mention" || e.type === "text_mention" || e.type === "bot_command",
		);

		return {
			messageId: msg.message_id as number,
			chatId: chat.id,
			chatType: chat.type as "private" | "group" | "supergroup" | "channel",
			text,
			from: from
				? {
						id: from.id,
						firstName: from.first_name ?? "",
						lastName: from.last_name,
						username: from.username,
					}
				: undefined,
			isMention,
			entities,
		};
	}

	// ── Low-level API call ───────────────────────────────────

	private async call(method: string, payload: Record<string, unknown>): Promise<unknown> {
		const url = `${this.baseUrl}/${method}`;

		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (!res.ok) {
			const errorBody = await res.text();
			console.error(`[TelegramService] ${method} failed (${res.status}):`, errorBody);

			// Retry once without Markdown parse_mode (formatting issues)
			if (method === "sendMessage" && payload.parse_mode && res.status === 400) {
				console.warn("[TelegramService] Retrying without Markdown…");
				const { parse_mode: _, ...rest } = payload;
				return this.call(method, rest);
			}

			throw new Error(`Telegram API ${method} failed: ${res.status}`);
		}

		const json = (await res.json()) as { ok: boolean; result: unknown };
		return json.result;
	}
}

// ── Types ────────────────────────────────────────────────

export interface TelegramMessage {
	messageId: number;
	chatId: number;
	chatType: "private" | "group" | "supergroup" | "channel";
	text: string;
	from?: {
		id: number;
		firstName: string;
		lastName?: string;
		username?: string;
	};
	isMention: boolean;
	entities: TelegramEntity[];
}

export interface TelegramEntity {
	type: string;
	offset: number;
	length: number;
	user?: { id: number; first_name?: string };
}
