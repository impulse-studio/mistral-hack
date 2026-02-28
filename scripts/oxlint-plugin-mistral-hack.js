/**
 * OxLint plugin: mistral-hack
 *
 * Custom rules for the mistral-hack monorepo.
 *
 * Rules:
 *   - tsx-pascal-case: Enforce casing for .ts/.tsx file names (configurable: PascalCase | camelCase).
 *   - folder-camel-case: Enforce camelCase folder names in configured paths.
 *   - export-prefix: Enforce that named exports are prefixed with the
 *     folder path (stripping configured root prefixes like components/, lib/).
 */

const PASCAL_CASE_RE = /^[A-Z][a-zA-Z0-9]*$/;
const CAMEL_CASE_RE = /^[a-z][a-zA-Z0-9]*$/;

/** @param {string} str */
function isPascalCase(str) {
	return PASCAL_CASE_RE.test(str);
}

/** @param {string} str */
function isCamelCase(str) {
	return CAMEL_CASE_RE.test(str);
}

/** @param {string} str */
function toPascalCase(str) {
	return str
		.split(/[-_]/)
		.map((s) => s[0].toUpperCase() + s.slice(1))
		.join("");
}

/** @param {string} str */
function toCamelCase(str) {
	const parts = str.split(/[-_]/);
	return (
		parts[0].toLowerCase() +
		parts
			.slice(1)
			.map((s) => s[0].toUpperCase() + s.slice(1))
			.join("")
	);
}

const CASING = {
	PascalCase: { check: isPascalCase, convert: toPascalCase },
	camelCase: { check: isCamelCase, convert: toCamelCase },
};

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
			description: "Enforce file name casing for .ts and .tsx files (PascalCase or camelCase)",
		},
		fixable: null,
		schema: [
			{
				type: "object",
				properties: {
					casing: {
						type: "string",
						enum: ["PascalCase", "camelCase"],
					},
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
		const casingName = options.casing || "PascalCase";
		const { check, convert } = CASING[casingName];
		const exclude = options.exclude || [];
		const filename = context.filename || context.getFilename();
		const normalized = filename.replace(/\\/g, "/");

		// Only apply to .ts / .tsx files
		if (!normalized.endsWith(".tsx") && !normalized.endsWith(".ts")) return {};

		// Skip declaration files (.d.ts)
		if (normalized.endsWith(".d.ts")) return {};

		// Check exclusions
		for (const pattern of exclude) {
			if (normalized.includes(pattern)) return {};
		}

		// Extract file stem: strip directory, then strip all extensions
		// e.g. "SignInForm.component.tsx" → "SignInForm"
		// e.g. "gameLoop.ts" → "gameLoop"
		const basename = normalized.split("/").pop();
		const stem = basename.split(".")[0];

		if (check(stem)) return {};

		const suggestion = convert(stem);
		let reported = false;

		return {
			Program(node) {
				if (reported) return;
				reported = true;
				context.report({
					message: `File name "${basename}" must use ${casingName}. Rename to "${suggestion}${basename.slice(stem.length)}".`,
					node,
				});
			},
		};
	},
};

// =========================================================================
// Rule: folder-camel-case
// =========================================================================
const folderCamelCaseRule = {
	meta: {
		docs: {
			description: "Enforce camelCase folder names within configured base paths",
		},
		fixable: null,
		schema: [
			{
				type: "object",
				properties: {
					basePaths: {
						type: "array",
						items: { type: "string" },
					},
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
		const basePaths = options.basePaths || [];
		const exclude = options.exclude || [];
		const filename = context.filename || context.getFilename();
		const normalized = filename.replace(/\\/g, "/");

		// Find matching base path
		let relativePath = null;
		for (const base of basePaths) {
			const normalizedBase = base.replace(/\\/g, "/");
			const idx = normalized.indexOf(`${normalizedBase}/`);
			if (idx !== -1) {
				relativePath = normalized.slice(idx + normalizedBase.length + 1);
				break;
			}
		}

		if (!relativePath) return {};

		// Get folder segments (drop file name)
		const segments = relativePath.split("/");
		segments.pop();

		if (segments.length === 0) return {};

		// Find first non-camelCase folder that isn't excluded
		const bad = segments.find((seg) => !isCamelCase(seg) && !exclude.includes(seg));

		if (!bad) return {};

		const suggestion = toCamelCase(bad);
		let reported = false;

		return {
			Program(node) {
				if (reported) return;
				reported = true;
				context.report({
					message: `Folder name "${bad}" must use camelCase. Rename to "${suggestion}".`,
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
		"folder-camel-case": folderCamelCaseRule,
		"export-prefix": exportPrefixRule,
	},
};

// oxlint-ignore-all
export default plugin;
