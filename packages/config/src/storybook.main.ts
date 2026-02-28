import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";

function getAbsolutePath(value: string) {
	return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

export function createStorybookConfig(
	packageDir: string,
	overrides?: Partial<StorybookConfig>,
): StorybookConfig {
	return {
		stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
		addons: [getAbsolutePath("@storybook/addon-a11y"), getAbsolutePath("@storybook/addon-docs")],
		framework: getAbsolutePath("@storybook/react-vite"),
		viteFinal: (viteConfig) => {
			if (process.env.STORYBOOK_BASE) {
				viteConfig.base = process.env.STORYBOOK_BASE;
			}
			viteConfig.resolve ??= {};
			viteConfig.resolve.alias = {
				...viteConfig.resolve.alias,
				"@": `${packageDir}/../src`,
			};
			viteConfig.plugins ??= [];
			viteConfig.plugins.push(tailwindcss());
			return viteConfig;
		},
		...overrides,
	};
}
