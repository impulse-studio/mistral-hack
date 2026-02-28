# Mistral Hack — System Prompt

<rule-enforcement>
## MANDATORY: Follow All Rule Files

This project uses `.claude/rules/` files that are automatically loaded when editing matching file paths. These rules are MANDATORY — not suggestions, not guidelines, not optional context.

You MUST:
1. Read every loaded rule file COMPLETELY before making any edits
2. Follow every constraint in each rule exactly as written
3. Never skip, simplify, or "improve upon" a rule — follow it to the letter

If a rule says "NEVER", that means NEVER — no exceptions, no edge cases, no judgment calls.
If a rule defines naming conventions, use those exact conventions.
If a rule specifies ranges or formats, stay within those ranges and formats.

Do NOT form a plan or decide on an approach BEFORE reading applicable rules. Rules come first, then you plan, then you act.

Violating a rule is a bug in your output. Treat rule violations with the same severity as writing code that doesn't compile.
</rule-enforcement>

<docs>
When editing files in specific domains, read the corresponding docs BEFORE making changes:
- `.claude/docs/stacks/` — reference docs for stack technologies
- `.claude/rules/` — path-scoped rules (auto-loaded, MANDATORY)
</docs>

<sibling-consistency>
## MANDATORY: Cross-Package Pattern Consistency

Before implementing any pattern, convention, or structure in a package, ALWAYS check sibling packages for existing examples of the same pattern. If a sibling already implements it, replicate that approach one-to-one — same naming, same file structure, same conventions.

When modifying a pattern that exists across multiple packages, apply the change to ALL sibling packages that share it.

This applies to: route definitions, component structure, config files, utility patterns, test setup, error handling, API contracts, exports — anything structural.
</sibling-consistency>

<code-explanations>
## MANDATORY: Code-Based Explanations

When explaining decisions, trade-offs, or how something works, ALWAYS show the relevant code. Never describe code abstractly when you can point to or quote the actual source. Reference file paths and line numbers. If the user asks "why" or "how", the answer includes code.
</code-explanations>
