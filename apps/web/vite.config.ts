import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	envDir: "../../",
	// nitro resolves a separate vite copy in bun monorepos — cast to unify Plugin types
	plugins: [tsconfigPaths(), tailwindcss(), tanstackStart(), nitro(), viteReact()],
	server: {
		port: 3003,
		host: "0.0.0.0",
	},
	ssr: {
		noExternal: ["@convex-dev/better-auth", "@noble/ciphers"],
	},
});
