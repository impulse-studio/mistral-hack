# The Definitive Guide to Writing an Effective CLAUDE.md

> **CLAUDE.md is the highest leverage point of your AI coding harness.** It appears in every conversation, making it the primary mechanism for onboarding AI agents into your codebase.

---

## Table of Contents

1. [Understanding the Fundamentals](#understanding-the-fundamentals)
2. [Core Principles](#core-principles)
3. [The WHAT-WHY-HOW Framework](#the-what-why-how-framework)
4. [Structuring with XML Tags](#structuring-with-xml-tags)
5. [Progressive Disclosure Architecture](#progressive-disclosure-architecture)
6. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
7. [Practical Examples](#practical-examples)
8. [Advanced Techniques](#advanced-techniques)
9. [Maintenance Strategy](#maintenance-strategy)

---

## Understanding the Fundamentals

### Why CLAUDE.md Matters

**LLMs are stateless.** They don't learn over time or remember previous sessions. Every conversation starts fresh with only the information in the current prompt. Since `CLAUDE.md` is automatically injected into every conversation, it becomes your **single source of truth** for teaching Claude about your project.

Think of it as:
- **Onboarding documentation** for an AI developer joining your team
- **A persistent system prompt** that shapes every interaction
- **Institutional knowledge** condensed into actionable instructions

### The Attention Budget Reality

Claude Code's system prompt already contains approximately **50 instructions**. Research indicates frontier LLMs can reliably follow **150-200 instructions** before performance degrades. This means your `CLAUDE.md` competes for limited attention space.

**Critical insight:** Every line in your CLAUDE.md must earn its place.

### How Claude Treats CLAUDE.md

Claude Code injects a system reminder when passing your CLAUDE.md content:

> *"IMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task."*

This means Claude is **explicitly told to treat your CLAUDE.md as optional**. The more non-universal instructions you include, the higher the likelihood Claude will dismiss the entire file.

**Why Anthropic added this:** Users often append "hotfixes" for undesired behaviors—piling on non-broadly-applicable instructions. By enabling Claude to ignore problematic instructions, the harness produces better overall outcomes.

### The Instruction Degradation Problem

Research reveals two critical patterns about instruction-following:

1. **Periphery Bias:** LLMs prioritize instructions at the **beginning and end** of prompts. Instructions in the middle receive less attention.

2. **Uniform Degradation:** Adding more instructions doesn't just cause some to be ignored—it **degrades instruction-following quality uniformly across ALL instructions**. Your most important rules become less reliable when surrounded by noise.

---

## Core Principles

### 1. Less is More

```
HARD MAXIMUM:  300 lines (beyond this, quality degrades significantly)
Target:        Under 100 lines
Ideal:         Under 60 lines (HumanLayer's production file)
```

**The Science Behind This:**
- Research shows frontier LLMs can reliably follow **150-200 instructions**
- Smaller/non-thinking models degrade **exponentially** as instruction count increases
- Frontier models degrade **linearly**, but still degrade
- Claude Code's system prompt already consumes **~50 instructions**
- This leaves you with roughly **100-150 instructions** before reliability drops

The best CLAUDE.md files are ruthlessly concise. HumanLayer's production CLAUDE.md contains fewer than 60 lines. Every sentence should pass this test: **"Does Claude need this for EVERY task?"**

### 2. Universal Applicability

Only include instructions that apply to **every single task**. The system includes a caveat that this context "may or may not be relevant," meaning non-universal instructions get deprioritized.

**Bad:** Database schema documentation (irrelevant when working on frontend)
**Good:** Project structure overview (always useful for navigation)

### 3. Pointers Over Content

Reference external documentation instead of embedding it.

```markdown
<!-- BAD: Embedding entire documentation -->
## API Endpoints
POST /users - Creates a new user...
GET /users/:id - Returns user by ID...
[200 more lines of API docs]

<!-- GOOD: Pointer to documentation -->
## API Reference
See `docs/api/README.md` for endpoint documentation.
When modifying APIs, check `src/routes/index.ts:15` for the router configuration.
```

### 4. File:Line References

Use the `file_path:line_number` format for precise navigation:

```markdown
- Authentication logic: `src/auth/middleware.ts:45`
- Database models: `src/models/index.ts:1`
- Build configuration: `webpack.config.js:23`
```

---

## The WHAT-WHY-HOW Framework

Every effective CLAUDE.md should cover three dimensions:

### WHAT: Project Structure

Provide a mental map of the codebase, especially critical for monorepos.

```markdown
<project-structure>
## Codebase Map

/src
  /api          - Backend REST endpoints
  /components   - React UI components
  /hooks        - Custom React hooks
  /utils        - Shared utilities
/packages
  /shared       - Shared types and utilities
  /cli          - Command-line tools
</project-structure>
```

### WHY: Purpose and Function

Explain the reasoning behind architectural decisions.

```markdown
<architecture-context>
## Architecture Decisions

- We use tRPC over REST for type-safe client-server communication
- State management is via Zustand (lightweight, minimal boilerplate)
- Tests live alongside source files (`*.test.ts`) for co-location
</architecture-context>
```

### HOW: Tools and Processes

Document the commands and workflows Claude needs.

```markdown
<workflows>
## Development Commands

Build: `bun run build`
Test: `bun test`
Lint: `bun run lint`
Type-check: `bun run typecheck`

## Verification Checklist
Before completing any task:
1. Run `bun run typecheck`
2. Run `bun test`
3. Run `bun run lint`
</workflows>
```

---

## Structuring with XML Tags

XML tags dramatically improve Claude's parsing accuracy and reduce interpretation errors.

### Why XML Tags Work

1. **Clarity:** Unambiguous boundaries between sections
2. **Accuracy:** Claude won't mix instructions with examples
3. **Flexibility:** Easy to add, remove, or modify sections
4. **Parseability:** Claude can reference specific sections by tag name

### Tag Naming Best Practices

```markdown
<!-- Use descriptive, self-documenting names -->
<project-context>...</project-context>
<build-commands>...</build-commands>
<coding-standards>...</coding-standards>
<critical-constraints>...</critical-constraints>

<!-- NOT vague or abbreviated -->
<ctx>...</ctx>
<cmds>...</cmds>
<rules>...</rules>
```

### Nesting for Hierarchy

```markdown
<project-configuration>
  <environment-setup>
    Required: Node 20+, Bun 1.0+
    Optional: Docker for database
  </environment-setup>

  <dependencies>
    Install: `bun install`
    Update: `bun update`
  </dependencies>
</project-configuration>
```

### Referencing Tags in Instructions

```markdown
<coding-standards>
- Use TypeScript strict mode
- Prefer functional components
- No default exports
</coding-standards>

When writing code, follow the standards defined in <coding-standards>.
```

---

## Progressive Disclosure Architecture

Instead of cramming everything into CLAUDE.md, create a documentation ecosystem.

### The Hub-and-Spoke Model

```
CLAUDE.md (hub)
    ├── agent_docs/architecture.md
    ├── agent_docs/testing.md
    ├── agent_docs/database.md
    └── agent_docs/deployment.md
```

### Implementation

```markdown
<!-- CLAUDE.md - The Hub -->
# Project: MyApp

<quick-reference>
Build: `bun run build`
Test: `bun test`
Dev: `bun dev`
</quick-reference>

<documentation-map>
## When You Need More Context

- **Architecture decisions:** See `agent_docs/architecture.md`
- **Testing patterns:** See `agent_docs/testing.md`
- **Database operations:** See `agent_docs/database.md`
- **Deployment process:** See `agent_docs/deployment.md`

Read these files BEFORE making changes in their respective areas.
</documentation-map>
```

### Benefits

1. **CLAUDE.md stays minimal:** Core instructions only
2. **Context on demand:** Claude reads detailed docs only when needed
3. **Easier maintenance:** Update specific docs without touching CLAUDE.md
4. **Reduced noise:** Task-specific information doesn't pollute unrelated work

---

## Anti-Patterns to Avoid

### 1. Using CLAUDE.md as a Linter

**DON'T:**
```markdown
## Code Style
- Use 2-space indentation
- Prefer single quotes
- Always use trailing commas
- Maximum line length: 80 characters
```

**WHY IT'S WRONG:**
- LLMs for linting is **expensive and slow** compared to deterministic tools
- Style requirements add irrelevant instructions, degrading overall performance
- Code snippets consume context budget unnecessarily

**The In-Context Learning Principle:** LLMs are in-context learners. Well-patterned, consistently styled code in your codebase naturally encourages Claude to follow existing conventions **without explicit instruction**.

**DO:** Use proper tooling and reference it:
```markdown
Code style is enforced by Biome (recommended) or ESLint/Prettier.
Run `bun run lint` to check and `bun run lint:fix` to auto-fix.
```

**Better Alternatives to Linting Instructions:**

1. **Stop Hooks:** Create hooks that run formatters/linters after Claude's changes, presenting errors for correction
2. **Slash Commands:** Embed style guidelines in commands linked to `git status` or version control changes
3. **Auto-fixing Linters:** Use tools like [Biome](https://biomejs.dev/) that automatically fix issues

These approaches separate implementation from formatting, improving results for both.

### 2. Auto-Generating the CLAUDE.md

**DON'T:** Use `/init` or any auto-generation scripts for CLAUDE.md.

**WHY IT'S WRONG:**

Consider the leverage hierarchy:
- Bad code → isolated problem
- Bad implementation plan → many lines of bad code
- Bad research/misunderstanding → cascading systemic problems
- **Bad CLAUDE.md → affects EVERY phase and ALL downstream artifacts**

CLAUDE.md is among the **highest-leverage components** of your entire harness. Auto-generation produces:
- Verbose, unfocused content
- Information the AI can discover itself
- Wasted context on obvious patterns

**DO:** Invest time carefully crafting every single line. CLAUDE.md should contain **only what Claude cannot easily discover** and **what must always be true**.

### 3. Task-Specific Instructions

**DON'T:**
```markdown
## Database Schema
The users table has columns: id, email, name, created_at...
When updating user records, always use transactions...
```

**WHY IT'S WRONG:** This becomes noise when working on unrelated tasks (frontend, CLI tools, documentation).

**DO:** Put database documentation in `agent_docs/database.md` and reference it:
```markdown
Database schema and query patterns: `agent_docs/database.md`
```

### 4. Duplicating Discoverable Information

**DON'T:**
```markdown
## Available Scripts
- build: Runs webpack build
- test: Runs Jest tests
- lint: Runs ESLint
[copies entire package.json scripts section]
```

**WHY IT'S WRONG:** Claude can read `package.json` itself.

**DO:** Only document non-obvious behaviors:
```markdown
## Build Notes
`bun run build` requires `.env` to exist (see `.env.example`).
Production builds use `bun run build:prod` which includes minification.
```

### 5. Vague or Aspirational Instructions

**DON'T:**
```markdown
- Write clean, maintainable code
- Follow best practices
- Ensure good test coverage
```

**WHY IT'S WRONG:** These are meaningless—Claude already tries to do this.

**DO:** Be specific and actionable:
```markdown
- All API endpoints must have integration tests in `tests/api/`
- New components require Storybook stories
- Functions over 50 lines should be refactored
```

---

## Practical Examples

### Minimal CLAUDE.md (Recommended Starting Point)

```markdown
# Project: TaskFlow

<overview>
Task management SPA with React frontend and Express API.
Monorepo using Bun workspaces.
</overview>

<structure>
/packages/web     - React frontend (Vite)
/packages/api     - Express backend
/packages/shared  - Shared types and utilities
</structure>

<commands>
Dev: `bun dev` (runs all packages)
Test: `bun test`
Build: `bun run build`
Typecheck: `bun run typecheck`
</commands>

<constraints>
- All code must pass `bun run typecheck` before commit
- API changes require updating shared types first
- No direct database queries outside `/packages/api/src/db/`
</constraints>

<docs>
Detailed documentation in `agent_docs/`:
- `architecture.md` - System design decisions
- `api.md` - API endpoint reference
- `testing.md` - Testing patterns and utilities
</docs>
```

**Line count: 28 lines**

### Production CLAUDE.md with XML Structure

```markdown
# MyCompany Platform

<project-identity>
B2B SaaS platform for workflow automation.
Tech: Next.js 14, tRPC, Prisma, PostgreSQL.
</project-identity>

<critical-paths>
Auth flow: `src/server/auth/` - DO NOT modify without security review
Billing: `src/server/billing/` - Changes require PM approval
Core engine: `src/engine/` - High test coverage required
</critical-paths>

<development-workflow>
## Commands
Install: `bun install`
Dev: `bun dev`
Test: `bun test`
Build: `bun run build`
DB migrate: `bun db:migrate`
DB studio: `bun db:studio`

## Before Every PR
1. `bun run typecheck`
2. `bun test`
3. `bun run lint`
4. Update CHANGELOG.md for user-facing changes
</development-workflow>

<navigation>
## Key Entry Points
- API routes: `src/server/api/routers/`
- UI components: `src/components/`
- Database schema: `prisma/schema.prisma`
- Environment config: `.env.example`
</navigation>

<conventions>
- Prefer server components; use 'use client' only when necessary
- All API mutations go through tRPC procedures
- Error handling: throw TRPCError, not generic Error
- Feature flags live in `src/config/features.ts`
</conventions>

<documentation-index>
Extended docs in `agent_docs/`:
- Architecture: `architecture.md`
- API design: `api-patterns.md`
- Testing: `testing-guide.md`
- Deployment: `deployment.md`
</documentation-index>
```

**Line count: 52 lines**

---

## Advanced Techniques

### Conditional Context Loading

Use CLAUDE.md to tell Claude when to load additional context:

```markdown
<context-loading-rules>
## Load Additional Context When:

- Modifying auth → Read `agent_docs/security.md` first
- Adding API endpoints → Read `agent_docs/api-patterns.md` first
- Database changes → Read `agent_docs/database.md` and run `bun db:studio`
- CI/CD changes → Read `.github/workflows/` and `agent_docs/deployment.md`
</context-loading-rules>
```

### Critical Constraints Block

Highlight absolute rules that must never be violated:

```markdown
<critical-constraints>
## NEVER
- Commit secrets or credentials (use .env)
- Modify migration files after they've been deployed
- Skip type checking before commits
- Push directly to main branch

## ALWAYS
- Run tests before submitting PRs
- Update types in /shared when modifying API contracts
- Use parameterized queries for database operations
</critical-constraints>
```

### Project-Specific Vocabulary

Define domain terminology Claude might not know:

```markdown
<domain-vocabulary>
## Our Terminology

- **Workflow**: A sequence of automated steps (not a GitHub workflow)
- **Trigger**: Event that starts a workflow execution
- **Connector**: Integration with external service (Slack, GitHub, etc.)
- **Execution**: Single run of a workflow
</domain-vocabulary>
```

### Combining Tags with Chain of Thought

```markdown
<verification-protocol>
## Before Claiming Task Completion

<thinking>
1. What files did I modify?
2. Did I run the type checker?
3. Did I run tests?
4. Are there edge cases I haven't considered?
</thinking>

<checklist>
- [ ] `bun run typecheck` passes
- [ ] `bun test` passes
- [ ] `bun run lint` passes
- [ ] Edge cases documented or handled
</checklist>
</verification-protocol>
```

---

## Maintenance Strategy

### Review Cadence

- **Weekly:** Remove outdated references
- **Monthly:** Audit for instruction creep
- **Per feature:** Update relevant sections only

### Signs Your CLAUDE.md Needs Trimming

1. Over 100 lines
2. Instructions that aren't followed consistently
3. Duplicate information findable in code
4. Task-specific content that should be separate docs
5. Vague aspirational guidelines

### Version Control Tips

```bash
# Track CLAUDE.md changes carefully
git log --oneline -p -- CLAUDE.md

# Before major changes, measure effectiveness
# (how often does Claude follow the instructions?)
```

### The Pruning Question

For each line, ask:
1. **Is this universally applicable?** (needed for every task)
2. **Is this discoverable?** (Claude could find this in the code)
3. **Is this actionable?** (concrete enough to follow)
4. **Does Claude actually follow this?** (if not, rewrite or remove)

If any answer is "no," consider removing or relocating that line.

---

## Summary Checklist

Before finalizing your CLAUDE.md:

- [ ] **HARD MAX: 300 lines** (quality degrades beyond this)
- [ ] Under 100 lines (target), ideally under 60 lines
- [ ] Covers WHAT, WHY, and HOW
- [ ] Uses XML tags for structure
- [ ] No linting rules (use Biome or similar tools instead)
- [ ] No auto-generated content (craft every line manually)
- [ ] No task-specific instructions in main file
- [ ] References to detailed docs via `agent_docs/`, not embedded content
- [ ] Uses `file:line` pointers for navigation
- [ ] All instructions are universal and actionable
- [ ] Critical constraints are clearly marked
- [ ] Most important instructions at beginning and end (periphery bias)

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    CLAUDE.md Essentials                      │
├─────────────────────────────────────────────────────────────┤
│  HARD MAX:         300 lines (quality degrades beyond)      │
│  Target:           <100 lines                               │
│  Ideal:            <60 lines (HumanLayer's standard)        │
│  Instruction Cap:  ~150 (system prompt uses ~50)            │
├─────────────────────────────────────────────────────────────┤
│  Structure:        XML tags for clear sections              │
│  Content:          Universal instructions ONLY              │
│  References:       file:line format for navigation          │
│  Details:          Separate agent_docs/ files               │
├─────────────────────────────────────────────────────────────┤
│  INCLUDE                    │  EXCLUDE                      │
│  ─────────────────────────  │  ─────────────────────────    │
│  Project structure map      │  Code style rules (use Biome) │
│  Build/test commands        │  Auto-generated content       │
│  Critical constraints       │  Task-specific docs           │
│  Doc file pointers          │  Discoverable information     │
│  Domain vocabulary          │  Vague guidelines             │
└─────────────────────────────────────────────────────────────┘
```

---

## Sources

- [HumanLayer: Writing a Good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
- [Anthropic: Use XML Tags to Structure Prompts](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/use-xml-tags)
