# lefthook - Git Hooks Manager Reference

<config-structure>

## YAML Structure

```yaml
# lefthook.yml (also: .lefthook.yml, lefthook.yaml, .lefthook.yaml)
# Local overrides: lefthook-local.yml (gitignored, merged automatically)
pre-commit:
  parallel: true          # run commands concurrently (default: false)
  piped: true             # run sequentially, stop on first failure
  follow: true            # run sequentially, continue on failure
  commands:
    my-command:
      run: npm run lint {staged_files}
  scripts:
    "my-script.sh":
      runner: bash
```

Only ONE of `parallel`, `piped`, `follow` should be set per hook.

</config-structure>
<commands-vs-scripts>

## Commands vs Scripts

**Commands** - inline `run:` shell commands. **Scripts** - files in `.lefthook/<hook-name>/`, need a `runner:`.
Prefer commands for one-liners. Use scripts for complex multi-line logic.
```yaml
commands:
  lint:
    run: bunx biome lint {staged_files}
    glob: "*.{ts,tsx,js,jsx}"
scripts:
  "check-branch.sh":
    runner: bash         # required
```

</commands-vs-scripts>
<command-options>

## Command Options
```yaml
commands:
  my-cmd:
    run: <command>         # REQUIRED. Shell command to execute
    glob: "*.{ts,js}"     # filter files by glob pattern
    exclude: ["dist/**"]  # exclude files matching these globs (MUST be array)
    root: "app/"           # cd to subdirectory (relative to repo root)
    files: "git diff --name-only" # custom file list command (replaces {files})
    stage_fixed: true      # auto `git add` modified files (pre-commit only)
    tags: [frontend, lint] # selective runs: lefthook run pre-commit --tags lint
    skip: [merge, rebase]  # skip during merge/rebase
    only: [{ ref: main }]  # only run on specific branch
    fail_text: "Fix msg"   # custom error message
    priority: 1            # execution order when piped (lower = earlier)
    env: { NODE_ENV: production }
```

</command-options>
<template-variables>

## Template Variables (used in `run:`)
| Variable | Resolves to |
|---|---|
| `{staged_files}` | Files staged for commit |
| `{push_files}` | Files committed but not yet pushed |
| `{all_files}` | All files tracked by git |
| `{files}` | Output of custom `files` command |
| `{0}` | All git hook arguments (space-joined) |
| `{1}`, `{2}` | Positional git hook arguments |

`glob`/`exclude` filter before substitution. Zero files = command skipped. Long file lists auto-split into multiple runs.

</template-variables>
<patterns>

## Common Patterns
```yaml
pre-commit:
  parallel: true
  commands:
    format:
      glob: "*.{ts,tsx,js,jsx,json}"
      run: bunx biome format --write {staged_files}
      stage_fixed: true
    lint:
      glob: "*.{ts,tsx,js,jsx}"
      run: bunx biome lint {staged_files}
    typecheck:                      # no file template = runs once if matching files exist
      glob: "*.{ts,tsx}"
      run: bunx tsc --noEmit
pre-push:
  commands:
    test:
      run: bun test
commit-msg:
  commands:
    validate:
      run: 'head -1 {1} | grep -qE "^(feat|fix|docs|chore)(\(.+\))?: .+"'
      fail_text: "Use conventional commits format"
```

</patterns>
<gotchas>

## Gotchas
1. **`glob` without file template still filters.** Checks if matching files exist; skips if none match.
2. **`stage_fixed: true` only works in `pre-commit`.** Runs `git add` on affected files after success.
3. **`parallel: true` + `stage_fixed: true` can race.** If multiple commands modify+re-stage, use `piped: true`.
4. **`exclude` must be an array** of glob strings, not a single string.
5. **Only ONE config file is used.** Don't have both `lefthook.yml` and `.lefthook.yml`.
6. **`{staged_files}` includes deleted files.** Your tool must handle missing files gracefully.
7. **`run` uses `sh`, not bash.** Avoid bashisms. For complex logic, use scripts with explicit `runner`.
8. **`root` is relative to repo root**, not to the config file.
9. **`glob` matches repo-relative paths.** Use `"*.ts"` for extension matching (matches full path).

</gotchas>
