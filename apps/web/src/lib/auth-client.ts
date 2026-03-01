import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	// Dev: Vite proxy on localhost handles /api/auth/*
	// Prod (SSR on Vercel): same-origin → TanStack Start server route proxies to Convex
	// Using Convex site URL directly would break cookies (cross-domain)
	baseURL: import.meta.env.DEV ? "http://localhost:3003" : undefined,
	plugins: [convexClient()],
});
