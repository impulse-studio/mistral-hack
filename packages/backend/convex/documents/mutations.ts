import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { documentTypeValidator } from "../schema";

// ── Internal (agent-facing) ────────────────────────────

export const createInternal = internalMutation({
	args: {
		title: v.string(),
		content: v.optional(v.string()),
		type: documentTypeValidator,
		tags: v.array(v.string()),
		createdBy: v.union(v.literal("manager"), v.literal("agent")),
		agentId: v.optional(v.id("agents")),
		taskId: v.optional(v.id("tasks")),
	},
	returns: v.id("documents"),
	handler: async (ctx, args) => {
		const now = Date.now();
		return await ctx.db.insert("documents", {
			...args,
			updatedAt: now,
			createdAt: now,
		});
	},
});

export const updateInternal = internalMutation({
	args: {
		documentId: v.id("documents"),
		title: v.optional(v.string()),
		content: v.optional(v.string()),
		tags: v.optional(v.array(v.string())),
		type: v.optional(documentTypeValidator),
	},
	returns: v.null(),
	handler: async (ctx, { documentId, ...updates }) => {
		const existing = await ctx.db.get(documentId);
		if (!existing) throw new Error(`Document ${documentId} not found`);
		const patch: Record<string, unknown> = { updatedAt: Date.now() };
		if (updates.title !== undefined) patch.title = updates.title;
		if (updates.content !== undefined) patch.content = updates.content;
		if (updates.tags !== undefined) patch.tags = updates.tags;
		if (updates.type !== undefined) patch.type = updates.type;
		await ctx.db.patch(documentId, patch);
		return null;
	},
});

// ── User-facing ────────────────────────────────────────

export const create = mutation({
	args: {
		title: v.string(),
		content: v.optional(v.string()),
		type: documentTypeValidator,
		tags: v.array(v.string()),
	},
	returns: v.id("documents"),
	handler: async (ctx, args) => {
		const now = Date.now();
		return await ctx.db.insert("documents", {
			...args,
			createdBy: "user",
			updatedAt: now,
			createdAt: now,
		});
	},
});

export const update = mutation({
	args: {
		documentId: v.id("documents"),
		title: v.optional(v.string()),
		content: v.optional(v.string()),
		tags: v.optional(v.array(v.string())),
		type: v.optional(documentTypeValidator),
	},
	returns: v.null(),
	handler: async (ctx, { documentId, ...updates }) => {
		const existing = await ctx.db.get(documentId);
		if (!existing) throw new Error(`Document ${documentId} not found`);
		const patch: Record<string, unknown> = { updatedAt: Date.now() };
		if (updates.title !== undefined) patch.title = updates.title;
		if (updates.content !== undefined) patch.content = updates.content;
		if (updates.tags !== undefined) patch.tags = updates.tags;
		if (updates.type !== undefined) patch.type = updates.type;
		await ctx.db.patch(documentId, patch);
		return null;
	},
});

export const remove = mutation({
	args: { documentId: v.id("documents") },
	returns: v.null(),
	handler: async (ctx, { documentId }) => {
		const doc = await ctx.db.get(documentId);
		if (!doc) return null;
		if (doc.storageId) {
			await ctx.storage.delete(doc.storageId);
		}
		await ctx.db.delete(documentId);
		return null;
	},
});

export const generateUploadUrl = mutation({
	args: {},
	returns: v.string(),
	handler: async (ctx) => {
		return await ctx.storage.generateUploadUrl();
	},
});

export const saveUpload = mutation({
	args: {
		storageId: v.id("_storage"),
		title: v.string(),
		mimeType: v.string(),
		sizeBytes: v.number(),
		tags: v.array(v.string()),
	},
	returns: v.id("documents"),
	handler: async (ctx, { storageId, title, mimeType, sizeBytes, tags }) => {
		const now = Date.now();
		return await ctx.db.insert("documents", {
			title,
			storageId,
			mimeType,
			sizeBytes,
			type: "upload",
			tags,
			createdBy: "user",
			updatedAt: now,
			createdAt: now,
		});
	},
});
