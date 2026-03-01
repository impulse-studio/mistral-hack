import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	envDir: "../../",
	// nitro resolves a separate vite copy in bun monorepos — cast to unify Plugin types
	plugins: [
		tsconfigPaths(),
		tailwindcss(),
		tanstackStart({
			spa: {
				enabled: true,
			},
		}),
		nitro({ preset: "node-server" }),
		viteReact(),
	],
	server: {
		port: 3003,
		host: "0.0.0.0",
		proxy: {
			"/api/auth": {
				target: "https://fast-aardvark-774.eu-west-1.convex.site",
				changeOrigin: true,
				secure: true,
			},
		},
	},
	ssr: {
		noExternal: ["@convex-dev/better-auth", "@noble/ciphers", "pixelarticons"],
	},
});
