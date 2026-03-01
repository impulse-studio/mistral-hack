import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { documentDoc, documentTypeValidator } from "../schema";

// ── User-facing queries ────────────────────────────────

export const list = query({
	args: {
		type: v.optional(documentTypeValidator),
		limit: v.optional(v.number()),
	},
	returns: v.array(documentDoc),
	handler: async (ctx, { type, limit }) => {
		const cap = limit ?? 50;
		if (type) {
			return await ctx.db
				.query("documents")
				.withIndex("by_type", (q) => q.eq("type", type))
				.order("desc")
				.take(cap);
		}
		return await ctx.db.query("documents").withIndex("by_updatedAt").order("desc").take(cap);
	},
});

export const get = query({
	args: { documentId: v.id("documents") },
	returns: v.union(
		v.object({
			...documentDoc.fields,
			url: v.optional(v.string()),
		}),
		v.null(),
	),
	handler: async (ctx, { documentId }) => {
		const doc = await ctx.db.get(documentId);
		if (!doc) return null;
		let url: string | undefined;
		if (doc.storageId) {
			url = (await ctx.storage.getUrl(doc.storageId)) ?? undefined;
		}
		return { ...doc, url };
	},
});

export const search = query({
	args: {
		query: v.string(),
		type: v.optional(documentTypeValidator),
		limit: v.optional(v.number()),
	},
	returns: v.array(documentDoc),
	handler: async (ctx, { query: searchQuery, type, limit }) => {
		const cap = limit ?? 20;
		let q = ctx.db.query("documents").withSearchIndex("search_title_content", (s) => {
			const base = s.search("title", searchQuery);
			if (type) return base.eq("type", type);
			return base;
		});
		return await q.take(cap);
	},
});

export const listByTask = query({
	args: {
		taskId: v.id("tasks"),
		limit: v.optional(v.number()),
	},
	returns: v.array(documentDoc),
	handler: async (ctx, { taskId, limit }) => {
		const cap = limit ?? 20;
		return await ctx.db
			.query("documents")
			.withIndex("by_task", (q) => q.eq("taskId", taskId))
			.order("desc")
			.take(cap);
	},
});

// ── Internal queries (for agent tools) ─────────────────

export const getInternal = internalQuery({
	args: { documentId: v.id("documents") },
	returns: v.union(documentDoc, v.null()),
	handler: async (ctx, { documentId }) => {
		return await ctx.db.get(documentId);
	},
});

export const searchInternal = internalQuery({
	args: {
		query: v.string(),
		type: v.optional(documentTypeValidator),
		limit: v.optional(v.number()),
	},
	returns: v.array(documentDoc),
	handler: async (ctx, { query: searchQuery, type, limit }) => {
		const cap = limit ?? 10;
		let q = ctx.db.query("documents").withSearchIndex("search_title_content", (s) => {
			const base = s.search("title", searchQuery);
			if (type) return base.eq("type", type);
			return base;
		});
		return await q.take(cap);
	},
});

export const listInternal = internalQuery({
	args: {
		type: v.optional(documentTypeValidator),
		limit: v.optional(v.number()),
	},
	returns: v.array(documentDoc),
	handler: async (ctx, { type, limit }) => {
		const cap = limit ?? 50;
		if (type) {
			return await ctx.db
				.query("documents")
				.withIndex("by_type", (q) => q.eq("type", type))
				.order("desc")
				.take(cap);
		}
		return await ctx.db.query("documents").withIndex("by_updatedAt").order("desc").take(cap);
	},
});
