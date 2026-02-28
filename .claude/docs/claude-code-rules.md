# Claude Code Rules & Memory System

> Reference for configuring Claude Code's memory hierarchy and modular `.claude/rules/` system.
> See also: [Writing Effective CLAUDE.md](./writing-effective-claude-md.md)

---

## Memory Hierarchy

| Type | Location | Scope | Shared? |
|------|----------|-------|---------|
| **Managed policy** | `/etc/claude-code/CLAUDE.md` (Linux) | Org-wide | All users |
| **Project memory** | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Project | Team (VCS) |
| **Project rules** | `./.claude/rules/*.md` | Project (modular) | Team (VCS) |
| **User memory** | `~/.claude/CLAUDE.md` | All projects | Personal |
| **User rules** | `~/.claude/rules/*.md` | All projects | Personal |
| **Local memory** | `./CLAUDE.local.md` | Project (private) | Personal (auto-gitignored) |
| **Auto memory** | `~/.claude/projects/<project>/memory/` | Per-project | Personal |

**Precedence:** More specific overrides broader. Project rules > user rules. Child CLAUDE.md files load on-demand when Claude reads files in those directories.

---

## Modular Rules with `.claude/rules/`

### Why Use Rules?

Instead of one large CLAUDE.md, split instructions into focused topic files. All `.md` files in `.claude/rules/` load automatically with the same priority as `.claude/CLAUDE.md`.

### Directory Structure

```
.claude/
├── CLAUDE.md              # Main project instructions (keep minimal)
└── rules/
    ├── code-style.md      # Code style guidelines
    ├── testing.md          # Testing conventions
    ├── security.md         # Security requirements
    ├── frontend/
    │   ├── react.md
    │   └── styles.md
    └── backend/
        ├── api.md
        └── database.md
```

Files are discovered **recursively** through subdirectories.

### Path-Specific (Conditional) Rules

Scope rules to specific files using YAML frontmatter with `paths`:

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API Development Rules

- All endpoints must include input validation
- Use the standard error response format
```

Rules **without** a `paths` field load unconditionally for all files.

### Glob Pattern Reference

| Pattern | Matches |
|---------|---------|
| `**/*.ts` | All TypeScript files in any directory |
| `src/**/*` | All files under `src/` |
| `*.md` | Markdown files in project root only |
| `src/components/*.tsx` | Components in specific directory |
| `src/**/*.{ts,tsx}` | Brace expansion — `.ts` and `.tsx` |
| `{src,lib}/**/*.ts` | Multiple directories via brace expansion |

Multiple patterns are supported:

```yaml
---
paths:
  - "src/**/*.ts"
  - "lib/**/*.ts"
  - "tests/**/*.test.ts"
---
```

### User-Level Rules

Personal rules that apply across all projects:

```
~/.claude/rules/
├── preferences.md    # Personal coding preferences
└── workflows.md      # Preferred workflows
```

User-level rules load **before** project rules (project rules take priority).

### Symlinks

`.claude/rules/` supports symlinks for sharing rules across projects:

```bash
# Symlink a shared rules directory
ln -s ~/shared-claude-rules .claude/rules/shared

# Symlink individual rule files
ln -s ~/company-standards/security.md .claude/rules/security.md
```

Circular symlinks are detected and handled gracefully.

---

## CLAUDE.md Imports

Import additional files using `@path/to/file` syntax:

```markdown
See @README for project overview and @package.json for available commands.

# Additional Instructions
- git workflow @docs/git-instructions.md
```

- Relative paths resolve relative to the **containing file**, not cwd
- Recursive imports supported (max depth: 5)
- Not evaluated inside code spans/blocks
- First-time imports trigger an approval dialog

For worktree-compatible personal instructions:

```markdown
# Individual Preferences
- @~/.claude/my-project-instructions.md
```

---

## Auto Memory

Claude's self-managed notes at `~/.claude/projects/<project>/memory/`:

```
memory/
├── MEMORY.md          # Index (first 200 lines loaded at startup)
├── debugging.md       # Topic files (loaded on-demand)
└── api-conventions.md
```

- `MEMORY.md` first 200 lines → system prompt every session
- Topic files → Claude reads when needed
- Force on/off: `CLAUDE_CODE_DISABLE_AUTO_MEMORY=0|1`
- Open with `/memory` command

---

## Best Practices

**For rules files:**
- One topic per file (e.g., `testing.md`, `api-design.md`)
- Descriptive filenames that indicate content
- Use `paths` frontmatter sparingly — only when rules truly apply to specific file types
- Group related rules in subdirectories (`frontend/`, `backend/`)

**For CLAUDE.md:**
- Keep concise — every line must earn its place
- Use `file:line` pointers instead of embedding docs
- Universal instructions only (applies to every task)
- Reference detailed docs via separate files, don't inline

**General:**
- Be specific and actionable, not vague
- Don't duplicate information Claude can discover from code
- Review periodically — remove outdated instructions
