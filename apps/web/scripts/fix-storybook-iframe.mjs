import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const outDir = join(import.meta.dirname, "..", "storybook-static");
const assetsDir = join(outDir, "assets");
const iframePath = join(outDir, "iframe.html");

async function main() {
	let existingIframe = "";
	try {
		existingIframe = await readFile(iframePath, "utf8");
	} catch {
		// Missing iframe is the bug this script fixes.
	}

	if (existingIframe.trim().length > 0) {
		return;
	}

	const assetFiles = await readdir(assetsDir);
	const previewEntry = assetFiles.find((file) => /^main-.*\.js$/.test(file));
	if (!previewEntry) {
		throw new Error("Storybook preview entry not found in storybook-static/assets.");
	}

	const cssFiles = assetFiles.filter((file) => /^(main|index)-.*\.css$/.test(file)).sort();
	const cssLinks = cssFiles
		.map((file) => `    <link rel=\"stylesheet\" href=\"./assets/${file}\" />`)
		.join("\n");

	const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Storybook</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
${cssLinks}
    <script>
      const parentWindow = window.parent && window.parent !== window ? window.parent : null;
      window.CONFIG_TYPE = parentWindow?.CONFIG_TYPE ?? "PRODUCTION";
      window.LOGLEVEL = parentWindow?.LOGLEVEL ?? "info";
      window.FRAMEWORK_OPTIONS = parentWindow?.FRAMEWORK_OPTIONS ?? {};
      window.CHANNEL_OPTIONS = parentWindow?.CHANNEL_OPTIONS ?? {};
      window.FEATURES = parentWindow?.FEATURES ?? {};
      window.STORIES = parentWindow?.STORIES ?? {};
      window.DOCS_OPTIONS = parentWindow?.DOCS_OPTIONS ?? {};
      window.TAGS_OPTIONS = parentWindow?.TAGS_OPTIONS ?? {};
      window.module = undefined;
      window.global = window;
    </script>
  </head>
  <body>
    <div id="storybook-root"></div>
    <div id="storybook-docs"></div>
    <script type="module" src="./assets/${previewEntry}"></script>
  </body>
</html>
`;

	await writeFile(iframePath, html, "utf8");
}

await main();
