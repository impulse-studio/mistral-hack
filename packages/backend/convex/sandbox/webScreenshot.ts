"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";

const FETCH_TIMEOUT_MS = 30_000;

export const captureScreenshot = internalAction({
	args: {
		url: v.string(),
		width: v.optional(v.number()),
		height: v.optional(v.number()),
	},
	handler: async (
		ctx,
		{ url, width, height },
	): Promise<{
		storageId: string;
		storageUrl: string | null;
		url: string;
		sizeBytes: number;
	}> => {
		const w = width ?? 1280;
		const h = height ?? 800;

		// Build Microlink API URL
		const apiUrl = new URL("https://api.microlink.io/");
		apiUrl.searchParams.set("url", url);
		apiUrl.searchParams.set("screenshot", "true");
		apiUrl.searchParams.set("meta", "false");
		apiUrl.searchParams.set("embed", "screenshot.url");
		apiUrl.searchParams.set("viewport.width", String(w));
		apiUrl.searchParams.set("viewport.height", String(h));

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

		try {
			// With embed=screenshot.url, Microlink redirects directly to the image
			const res = await globalThis.fetch(apiUrl.toString(), {
				signal: controller.signal,
				redirect: "follow",
			});

			if (!res.ok) {
				throw new Error(`Microlink API error: ${res.status} ${res.statusText}`);
			}

			const blob = await res.blob();
			const storageId = await ctx.storage.store(blob);
			const storageUrl = await ctx.storage.getUrl(storageId);

			return {
				storageId,
				storageUrl,
				url,
				sizeBytes: blob.size,
			};
		} finally {
			clearTimeout(timeout);
		}
	},
});
