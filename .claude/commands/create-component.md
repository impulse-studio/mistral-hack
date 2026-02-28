# Create Component

Create a new React component following project conventions.

## Input

$ARGUMENTS — Component name and optional flags. Examples:
- `SignInForm` — feature component at `components/SignInForm.component.tsx`
- `office/OfficeCanvas` — feature component in a subfolder
- `ui/Badge` — shadcn-style primitive at `components/ui/Badge.tsx`

## Rules

1. Read `.claude/rules/web-components.md` BEFORE creating any file — follow every rule exactly.
2. Read `.claude/docs/stacks/styling.md` BEFORE writing any styles.
3. **Naming**:
   - If path starts with `ui/` → plain `.tsx` (shadcn primitive, no `.component.tsx` suffix)
   - Otherwise → `.component.tsx` (feature component)
   - All `.tsx` files use PascalCase
4. **File location**: `apps/web/src/components/<path>`
5. **Check sibling components** in the target directory and match their patterns exactly (imports, export style, props interface naming, etc.)

## Steps

1. Parse `$ARGUMENTS` to extract the component name and optional subfolder.
2. Determine if this is a `ui/` primitive or a feature component.
3. Check sibling files in the target directory for existing patterns.
4. Create the component file with:
   - Named export (not default)
   - Props interface named `{ComponentName}Props`
   - `cn()` utility for className merging if the component accepts className
5. Run `bun check-types` to verify the new file compiles.
6. Report the created file path.
