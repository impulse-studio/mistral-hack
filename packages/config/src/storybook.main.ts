import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";

function getAbsolutePath(value: string) {
	return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

/**
 * Storybook loads the app's vite.config.ts and merges its plugins.
 * App-specific plugins (TanStack Start/Router) conflict with Storybook's own
 * build — TanStack Start overwrites rollupOptions.input which removes the
 * iframe.html entry and breaks the preview.
 */
const APP_PLUGIN_PREFIXES = [
	"tanstack-start",
	"tanstack-react-start",
	"tanstack-router",
	"tanstack:router",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Vite plugin arrays are loosely typed
function stripAppPlugins(plugins: any[]): any[] {
	return plugins.filter((p) => {
		const name = p?.name;
		if (typeof name === "string") {
			return !APP_PLUGIN_PREFIXES.some((prefix) => name.startsWith(prefix));
		}
		return true;
	});
}

export function createStorybookConfig(
	packageDir: string,
	overrides?: Partial<StorybookConfig>,
): StorybookConfig {
	return {
		stories: ["../src/**/*.stories.@(ts|tsx)"],
		addons: [getAbsolutePath("@storybook/addon-a11y"), getAbsolutePath("@storybook/addon-docs")],
		framework: getAbsolutePath("@storybook/react-vite"),
		viteFinal: (viteConfig) => {
			const storybookConvexUrl = process.env.VITE_CONVEX_URL ?? "https://example.com";
			const storybookConvexSiteUrl = process.env.VITE_CONVEX_SITE_URL ?? "https://example.com";

			viteConfig.define ??= {};
			viteConfig.define["import.meta.env.VITE_CONVEX_URL"] = JSON.stringify(storybookConvexUrl);
			viteConfig.define["import.meta.env.VITE_CONVEX_SITE_URL"] =
				JSON.stringify(storybookConvexSiteUrl);

			if (process.env.STORYBOOK_BASE) {
				viteConfig.base = process.env.STORYBOOK_BASE;
			}
			viteConfig.resolve ??= {};
			viteConfig.resolve.alias = {
				...viteConfig.resolve.alias,
				"@": `${packageDir}/../src`,
			};

			// Strip app-specific plugins that conflict with Storybook's build.
			// Storybook loads the app's vite.config.ts and merges its plugins;
			// TanStack Start/Router plugins overwrite rollupOptions.input which
			// removes the iframe.html entry and breaks the preview.
			if (viteConfig.plugins) {
				const flat = (viteConfig.plugins as unknown as unknown[]).flat(Infinity);
				viteConfig.plugins = stripAppPlugins(flat);
			}
			viteConfig.plugins ??= [];
			viteConfig.plugins.push(tailwindcss());
			return viteConfig;
		},
		...overrides,
	};
}
