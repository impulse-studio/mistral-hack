/**
 * OxLint plugin: mistral-hack
 *
 * Custom rules for the mistral-hack monorepo.
 *
 * Rules:
 *   - tsx-pascal-case: Enforce PascalCase file names for .tsx files.
 *   - export-prefix: Enforce that named exports are prefixed with the
 *     folder path (stripping configured root prefixes like components/, lib/).
 */

const PASCAL_CASE_RE = /^[A-Z][a-zA-Z0-9]*$/;

/**
 * Check if a string is PascalCase.
 * @param {string} str
 * @returns {boolean}
 */
function isPascalCase(str) {
	return PASCAL_CASE_RE.test(str);
}

/**
 * Convert a kebab-case or snake_case string to PascalCase.
 * @param {string} str
 * @returns {string}
 */
function toPascalCase(str) {
	return str
		.split(/[-_]/)
		.map((s) => s[0].toUpperCase() + s.slice(1))
		.join("");
}

/** @param {string[]} segments */
function segmentsToCamelCase(segments) {
	if (segments.length === 0) return "";
	return (
		segments[0] +
		segments
			.slice(1)
			.map((s) => s[0].toUpperCase() + s.slice(1))
			.join("")
	);
}

/**
 * @param {import("eslint").Rule.Node} node
 * @returns {Array<{name: string, node: import("eslint").Rule.Node}>}
 */
function extractExportNames(node) {
	const names = [];

	// export { foo, bar } from './other' — skip re-exports
	if (node.source) return names;

	const decl = node.declaration;
	if (decl) {
		switch (decl.type) {
			case "VariableDeclaration": {
				for (const declarator of decl.declarations) {
					if (declarator.id?.name) {
						names.push({ name: declarator.id.name, node: declarator.id });
					}
				}
				break;
			}
			case "FunctionDeclaration":
			case "ClassDeclaration":
			case "TSEnumDeclaration": {
				if (decl.id?.name) {
					names.push({ name: decl.id.name, node: decl.id });
				}
				break;
			}
			case "TSTypeAliasDeclaration":
			case "TSInterfaceDeclaration": {
				if (decl.id?.name) {
					names.push({ name: decl.id.name, node: decl.id });
				}
				break;
			}
		}
	}

	// export { foo, bar }
	if (node.specifiers) {
		for (const spec of node.specifiers) {
			if (spec.exported?.name) {
				names.push({ name: spec.exported.name, node: spec.exported });
			}
		}
	}

	return names;
}

// =========================================================================
// Rule: tsx-pascal-case
// =========================================================================
const tsxPascalCaseRule = {
	meta: {
		docs: {
			description: "Enforce PascalCase file names for .tsx files",
		},
		fixable: null,
		schema: [
			{
				type: "object",
				properties: {
					exclude: {
						type: "array",
						items: { type: "string" },
					},
				},
			},
		],
	},
	create(context) {
		const options = context.options[0] || {};
		const exclude = options.exclude || [];
		const filename = context.filename || context.getFilename();
		const normalized = filename.replace(/\\/g, "/");

		// Only apply to .tsx files
		if (!normalized.endsWith(".tsx")) return {};

		// Check exclusions
		for (const pattern of exclude) {
			if (normalized.includes(pattern)) return {};
		}

		// Extract file stem: strip directory, then strip all extensions
		// e.g. "SignInForm.component.tsx" → "SignInForm"
		// e.g. "Button.stories.tsx" → "Button"
		const basename = normalized.split("/").pop();
		const stem = basename.split(".")[0];

		if (isPascalCase(stem)) return {};

		const suggestion = toPascalCase(stem);
		let reported = false;

		return {
			Program(node) {
				if (reported) return;
				reported = true;
				context.report({
					message: `File name "${basename}" must use PascalCase. Rename to "${suggestion}${basename.slice(stem.length)}".`,
					node,
				});
			},
		};
	},
};

// =========================================================================
// Rule: export-prefix
// =========================================================================
const exportPrefixRule = {
	meta: {
		docs: {
			description:
				"Enforce that named exports are prefixed with the folder path relative to a configured base path, stripping configured root folders",
		},
		fixable: null,
		schema: [
			{
				type: "object",
				properties: {
					targets: {
						type: "array",
						items: {
							type: "object",
							properties: {
								path: { type: "string" },
								stripPrefixes: {
									type: "array",
									items: { type: "string" },
								},
								exclude: {
									type: "array",
									items: { type: "string" },
								},
							},
							required: ["path"],
						},
					},
				},
			},
		],
	},
	create(context) {
		const options = context.options[0] || {};
		const targets = options.targets || [];
		const filename = context.filename || context.getFilename();
		const normalizedFilename = filename.replace(/\\/g, "/");

		// Find the matching target
		let matchedTarget = null;
		let relativePath = null;

		for (const target of targets) {
			const normalizedTargetPath = target.path.replace(/\\/g, "/");
			const idx = normalizedFilename.indexOf(`${normalizedTargetPath}/`);
			if (idx !== -1) {
				relativePath = normalizedFilename.slice(idx + normalizedTargetPath.length + 1);
				matchedTarget = target;
				break;
			}
		}

		if (!matchedTarget || !relativePath) return {};

		// Check exclusions
		const exclude = matchedTarget.exclude || [];
		for (const pattern of exclude) {
			if (relativePath.startsWith(`${pattern}/`) || relativePath === pattern) {
				return {};
			}
		}

		// Skip test/story files
		if (relativePath.match(/\.(test|spec|stories)(-d)?\.(ts|tsx)$/)) return {};

		// Strip configured root prefixes (e.g. "components/", "lib/")
		const stripPrefixes = matchedTarget.stripPrefixes || [];
		for (const prefix of stripPrefixes) {
			const normalized = prefix.endsWith("/") ? prefix : `${prefix}/`;
			if (relativePath.startsWith(normalized)) {
				relativePath = relativePath.slice(normalized.length);
				break;
			}
		}

		// Derive prefix from folder path
		const segments = relativePath.split("/");
		const fileName = segments.pop(); // remove filename

		let prefix;
		if (segments.length > 0) {
			// Use folder segments joined as camelCase
			// Normalize each segment from kebab-case to camelCase
			const normalizedSegments = segments.map((s) =>
				s
					.split("-")
					.map((part, i) => (i === 0 ? part : part[0].toUpperCase() + part.slice(1)))
					.join(""),
			);
			prefix = segmentsToCamelCase(normalizedSegments);
		} else {
			// Root-level file: use filename stem (before first dot),
			// normalized from kebab-case to camelCase
			const stem = fileName.split(".")[0];
			const parts = stem.split("-");
			prefix = parts
				.map((part, i) => (i === 0 ? part : part[0].toUpperCase() + part.slice(1)))
				.join("");
		}

		const prefixLower = prefix.toLowerCase();

		return {
			ExportNamedDeclaration(node) {
				const exports = extractExportNames(node);

				for (const { name, node: exportNode } of exports) {
					if (!name.toLowerCase().startsWith(prefixLower)) {
						context.report({
							message: `Export "${name}" must be prefixed with "${prefix}". Expected something like "${prefix}${name[0].toUpperCase()}${name.slice(1)}" or "${prefix}...".`,
							node: exportNode,
						});
					}
				}
			},
		};
	},
};

// =========================================================================
// Plugin export
// =========================================================================
const plugin = {
	meta: {
		name: "mistral-hack",
	},
	rules: {
		"tsx-pascal-case": tsxPascalCaseRule,
		"export-prefix": exportPrefixRule,
	},
};

// oxlint-ignore-all
export default plugin;
