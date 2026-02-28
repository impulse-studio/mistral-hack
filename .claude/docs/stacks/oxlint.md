# oxlint - High-Performance JavaScript/TypeScript Linter

<overview>

Rust-based linter from the OXC (Oxidation Compiler) project. 50-100x faster than ESLint.
675+ rules natively in Rust. Default: only `correctness` category enabled.
Install: `pnpm add -D oxlint`. Run: `oxlint [PATH]`.

</overview>
<config-format>

## Config: `.oxlintrc.json`

JSONC format (comments OK, trailing commas NOT OK). ESLint v8 `eslintrc.json` compatible.

```jsonc
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "import", "unicorn"],
  "categories": { "correctness": "error", "suspicious": "warn" },
  "env": { "browser": true },
  "globals": { "MY_GLOBAL": "readonly" },
  "rules": {
    "eqeqeq": "warn",
    "import/no-cycle": "error",
    "typescript/no-explicit-any": ["error"],
    "no-plusplus": ["error", { "allowForLoopAfterthoughts": true }]
  },
  "overrides": [{
    "files": ["*.test.ts", "*.spec.ts"],
    "rules": { "typescript/no-explicit-any": "off" }
  }],
  "extends": ["./configs/base.json"]
}
```


</config-format>
<severity>

## Rule Severity

**Off**: `"off"` / `0` / `"allow"` | **Warn**: `"warn"` / `1` | **Error**: `"error"` / `2` / `"deny"`
With options: `"rule-name": ["error", { ...options }]`

</severity>
<categories>

## Categories

| Category | Description |
|---|---|
| `correctness` | Definitely wrong/useless **(default: enabled)** |
| `suspicious` | Likely wrong or useless |
| `pedantic` | Extra strict, may false-positive |
| `perf` | Runtime performance |
| `style` | Idiomatic consistency |
| `restriction` | Bans specific patterns |
| `nursery` | Unstable, may change between versions |

Individual `rules` entries override `categories` severity.

</categories>
<plugins>

## Plugins

Native Rust implementations. Set via `plugins` array or CLI `--<name>-plugin` flags.
**Available:** `eslint`, `react`, `unicorn`, `typescript`, `oxc`, `import`, `jsdoc`, `jest`, `vitest`, `jsx-a11y`, `nextjs`, `react-perf`, `promise`, `node`, `vue`
**Setting `plugins` overwrites ALL defaults.** Must list every plugin you want.
Rules use plugin prefix: `"typescript/no-explicit-any"`, `"import/no-cycle"`, `"react/jsx-key"`.

</plugins>
<cli>

## CLI

```bash
oxlint [PATH]                       # lint (default: current dir)
oxlint -c .oxlintrc.json            # explicit config
oxlint --fix                        # safe auto-fix
oxlint --fix-suggestions            # apply suggested fixes
oxlint -D suspicious -W pedantic    # deny/warn categories via CLI
oxlint -A no-console                # allow specific rule
oxlint --type-aware                 # type-informed rules (TS Go port)
oxlint --tsconfig ./tsconfig.json   # specify tsconfig
oxlint -f github                    # output: github|json|checkstyle|unix|stylish
oxlint --quiet                      # suppress warnings
oxlint --deny-warnings              # exit non-zero on warnings
oxlint --ignore-pattern "dist/**"   # ignore pattern
oxlint --rules                      # list all rules
oxlint --init                       # create default config
```

</cli>
<biome-complement>

## Alongside Biome

Complement, not conflict. **Biome**: formatting + its own lint rules. **Oxlint**: deep lint catalog, plugin-specific rules (import cycles, React hooks, TS strictness, unicorn).
Biome replaces Prettier, oxlint replaces ESLint + plugins. Use both for full coverage.

</biome-complement>
<gotchas>

## Gotchas

1. **`plugins` overwrites defaults.** Omit the field to keep defaults. `"plugins": ["typescript"]` disables everything else.
2. **Rule prefixes matter.** Must be `"typescript/no-explicit-any"`, not `"no-explicit-any"`. Prefix only optional if rule name is globally unique.
3. **Default = only `correctness`.** All other categories off until explicitly enabled.
4. **`--fix-dangerously` can break code.** Stick to `--fix` for safe fixes.
5. **Rules override categories.** Individual `rules` entries take precedence over `categories` severity.
6. **JSONC, not JSON5.** Comments allowed, trailing commas NOT.
7. **Inline ignores use oxlint syntax:** `// oxlint-ignore` (next line), `// oxlint-ignore-all` (file), `// oxlint-ignore rule-name`. NOT `eslint-disable`.
8. **`nursery` rules are unstable.** May change or be removed between versions.

</gotchas>
