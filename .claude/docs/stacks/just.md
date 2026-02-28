# just - Command Runner Reference

<syntax>

## Recipes, Variables, Dependencies

```just
version := "1.0.0"
export DATABASE_URL := "postgres://localhost/mydb"

default: build test                 # first recipe is the default
build: clean                        # dependency runs first
  cargo build --release
deploy: (build "release")           # dependency with arguments
all: build && test deploy           # && = subsequent deps (run AFTER body)

# required, optional with default, variadic (+= 1 or more, *= 0 or more)
greet name greeting="Hello" *extras:
  echo "{{greeting}}, {{name}} {{extras}}"
```

## Each Line Is a Separate Shell

Most common bug. Each recipe line is a NEW shell process.

```just
# BROKEN - cd lost between lines
broken:
  cd src
  ls              # still in original directory

# FIX 1: chain with &&
fixed:
  cd src && ls

# FIX 2: shebang (entire body = one script)
fixed-shebang:
  #!/usr/bin/env bash
  set -euo pipefail
  cd src
  ls

# FIX 3: [script] attribute (uses set shell, no shebang needed)
[script]
fixed-script:
  set -euo pipefail
  cd src
  ls
```

</syntax>
<settings>

## Settings

```just
set shell := ["bash", "-euc"]       # default: ["sh", "-cu"]
set dotenv-load                      # load .env (NOT automatic)
set dotenv-path := ".env.local"      # custom .env path
set export                           # export all just vars as env vars
set positional-arguments             # pass recipe args as $1, $2...
set quiet                            # suppress command echoing
set working-directory := "subdir"    # change default cwd
```

</settings><features>

## Conditionals, Functions, Strings

```just
mode := if env("CI", "") != "" { "release" } else { "debug" }
# Operators: ==  !=  =~ (regex)
build:
  cargo build {{ if mode == "release" { "--release" } else { "" } }}

project_root := justfile_directory()
current_os   := os()                          # "linux", "macos", "windows"
current_arch := arch()                        # "x86_64", "aarch64"
git_hash     := `git rev-parse --short HEAD`  # backtick = command substitution

# Strings: single='literal', double="escapes \n", / joins paths, + concats
full_path := project_root / "build" / "output"
```

## OS-Specific Recipes

```just
[linux]
open path:
  xdg-open {{path}}
[macos]
open path:
  open {{path}}
```

## Attributes

```just
[confirm("Delete everything?")]   # prompt before running
[no-cd]                           # don't cd to justfile directory
[private]                         # hide from --list (same as _ prefix)
[group("dev")]                    # organize in just --list
[doc("Run the test suite")]       # description shown in just --list
```

## Modules and Imports

```just
import 'common.just'              # import recipes from another file
import? 'optional.just'           # no error if missing
mod deploy                         # load deploy.just or deploy/mod.just
# invoke: just deploy::production
```

</features>
<patterns>

## Common Patterns

```just
test *args:                        # pass-through args
  bun test {{args}}
build *args:
  bunx turbo run build {{args}}
up *services:
  podman compose up -d {{services}}
check: fmt lint typecheck          # aggregate (no body, just deps)
fmt:
  bunx biome format --write .
_ensure-deps:                      # _ prefix = hidden helper
  @command -v bun >/dev/null || (echo "bun required" && exit 1)
```

</patterns>
<gotchas>

## Gotchas

1. **Each line = separate shell.** cd/variables/shell options don't persist. Use `&&`, shebang, or `[script]`.
2. **Indentation: tabs OR spaces, never mix.** Tabs are the default.
3. **`{{` is just interpolation, not shell.** Shell vars: `$VAR`. Just vars: `{{var}}`. Literal `{{`: use `{{{{`.
4. **`@` suppresses echoing** a line. On recipe name, suppresses all lines.
5. **`-` prefix ignores errors** on that line.
6. **`set shell` does NOT affect shebang recipes.** Shebangs use their `#!` interpreter.
7. **Dependencies deduplicate.** Same recipe+args runs at most once per invocation.
8. **`set dotenv-load` is required** to load `.env`. Not automatic.
9. **`export` affects recipes** but NOT backtick evaluation at parse time.
10. **First recipe is the default** unless `[default]` attribute is used elsewhere.

</gotchas>
