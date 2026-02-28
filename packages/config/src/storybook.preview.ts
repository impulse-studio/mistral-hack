import type { Preview } from "@storybook/react-vite";

export function createStorybookPreview(overrides?: Partial<Preview>): Preview {
	return {
		parameters: {
			controls: {
				matchers: {
					color: /(background|color)$/i,
					date: /Date$/i,
				},
			},
		},
		...overrides,
	};
}
