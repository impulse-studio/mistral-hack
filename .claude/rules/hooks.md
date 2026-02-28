---
paths:
  - ".claude/settings.json"
  - ".claude/hooks/**"
  - "**/.claude/settings.json"
  - "**/.claude/hooks/**"
---

# Claude Code Hooks

BEFORE creating or editing hooks, you MUST:

1. Read `.claude/docs/claude-code-hooks.md` for the full reference
2. Hook scripts receive JSON on stdin — always parse with `jq`
3. Exit codes: `0` = allow, `2` = block. Anything else = error
4. stdout goes to Claude's context — use `>&2` for debug output
5. Always `chmod +x` hook scripts after creating them
