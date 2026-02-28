---
paths:
  - "apps/web/src/**/*.ts"
---

# Web `.ts` File Naming

- **All `.ts` files MUST use camelCase** — Enforced by `mistral-hack/tsx-pascal-case` with `"casing": "camelCase"` override in `.oxlintrc.json`.
- **Standard files excluded** — `index.ts`, `types.ts`, `constants.ts`, `utils.ts`, `.d.ts` keep lowercase names.
- **Routes excluded** — Files in `routes/` follow TanStack Router conventions.
- **Exports MUST be prefix-scoped** — Enforced by `mistral-hack/export-prefix`. See `scripts/oxlint-plugin-mistral-hack.js`.
