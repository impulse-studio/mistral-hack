# Experiments

Throwaway playground for design drafts, UI prototypes, and AI-generated experiments.

## Structure
Each experiment is a self-contained subfolder following this naming convention:
```
YYYY-MM-DD-name/
```

**Examples:**
- `2025-01-15-auth-flow-test/`
- `2025-03-22-new-terminal-ui/`
- `2026-02-28-chat-interface/`

**Rules:**
- Date is the creation date
- Name is lowercase, kebab-case, descriptive but concise
- Each subfolder is its own standalone app (own `package.json`, `vite.config.ts`, etc.)
- Can import from workspace packages: `@mistral-hack/env`, `@mistral-hack/config`, `@mistral-hack/backend`
- No production quality bar — speed over polish
- No tests, no linting strictness, no type perfection required
- Files here are disposable. Delete freely.
