import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { env } from "@mistral-hack/env/web";

export const authClient = createAuthClient({
	baseURL: import.meta.env.DEV ? "http://localhost:3003" : env.VITE_CONVEX_SITE_URL,
	plugins: [convexClient()],
});
