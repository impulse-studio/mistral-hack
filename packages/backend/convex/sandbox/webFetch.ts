"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";

const MAX_BODY_BYTES = 100_000; // ~100KB — keep payloads manageable for LLM context
const FETCH_TIMEOUT_MS = 30_000;

// Fetch a URL from the Convex backend (which has unrestricted internet).
// Acts as a proxy for sandbox agents that can't reach the open web.
export const fetch = internalAction({
	args: {
		url: v.string(),
		method: v.optional(v.string()),
		headers: v.optional(v.any()),
		maxBytes: v.optional(v.number()),
	},
	handler: async (
		_ctx,
		{ url, method, headers, maxBytes },
	): Promise<{
		ok: boolean;
		status: number;
		statusText: string;
		body: string;
		contentType: string;
		truncated: boolean;
	}> => {
		const limit = maxBytes ?? MAX_BODY_BYTES;

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

		try {
			const res = await globalThis.fetch(url, {
				method: method ?? "GET",
				headers: headers as Record<string, string> | undefined,
				signal: controller.signal,
				redirect: "follow",
			});

			const contentType = res.headers.get("content-type") ?? "";
			const isText =
				contentType.includes("text/") ||
				contentType.includes("json") ||
				contentType.includes("xml") ||
				contentType.includes("javascript");

			let body: string;
			let truncated = false;

			if (isText) {
				const fullText = await res.text();
				if (fullText.length > limit) {
					body = fullText.slice(0, limit);
					truncated = true;
				} else {
					body = fullText;
				}
			} else {
				// For binary content, just return metadata
				body = `[Binary content: ${contentType}, ${res.headers.get("content-length") ?? "unknown"} bytes]`;
				truncated = false;
			}

			return {
				ok: res.ok,
				status: res.status,
				statusText: res.statusText,
				body,
				contentType,
				truncated,
			};
		} finally {
			clearTimeout(timeout);
		}
	},
});

// Fetch a URL and extract readable text content (strips HTML tags).
// Optimized for feeding web pages to an LLM.
export const fetchReadable = internalAction({
	args: {
		url: v.string(),
		maxBytes: v.optional(v.number()),
	},
	handler: async (
		_ctx,
		{ url, maxBytes },
	): Promise<{
		ok: boolean;
		status: number;
		title: string;
		text: string;
		truncated: boolean;
	}> => {
		const limit = maxBytes ?? MAX_BODY_BYTES;

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

		try {
			const res = await globalThis.fetch(url, {
				method: "GET",
				headers: {
					"User-Agent":
						"Mozilla/5.0 (compatible; AI-Office-Researcher/1.0; +https://github.com/anthropics)",
					Accept: "text/html,application/xhtml+xml,text/plain,application/json",
				},
				signal: controller.signal,
				redirect: "follow",
			});

			if (!res.ok) {
				return {
					ok: false,
					status: res.status,
					title: "",
					text: `HTTP ${res.status} ${res.statusText}`,
					truncated: false,
				};
			}

			const html = await res.text();

			// Extract title
			const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
			const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, " ") : "";

			// Strip HTML to get readable text
			const text = htmlToText(html);

			const truncated = text.length > limit;
			return {
				ok: true,
				status: res.status,
				title,
				text: truncated ? text.slice(0, limit) : text,
				truncated,
			};
		} finally {
			clearTimeout(timeout);
		}
	},
});

// Minimal HTML → text conversion (no external deps)
function htmlToText(html: string): string {
	return (
		html
			// Remove script/style blocks
			.replace(/<script[\s\S]*?<\/script>/gi, "")
			.replace(/<style[\s\S]*?<\/style>/gi, "")
			.replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
			// Block elements → newlines
			.replace(
				/<\/?(p|div|br|hr|h[1-6]|li|tr|blockquote|pre|section|article|header|footer|nav|main)[^>]*>/gi,
				"\n",
			)
			// Strip remaining tags
			.replace(/<[^>]+>/g, " ")
			// Decode common entities
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&nbsp;/g, " ")
			// Collapse whitespace
			.replace(/[ \t]+/g, " ")
			.replace(/\n[ \t]+/g, "\n")
			.replace(/\n{3,}/g, "\n\n")
			.trim()
	);
}
