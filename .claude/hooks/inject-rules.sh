#!/bin/bash
# PreToolUse hook for Edit, Write, Read tools
# Replicates .claude/rules/ path-scoped injection because the built-in loader
# silently drops rules when CLAUDE.md + memory exceeds ~6KB.

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Only handle file operation tools
case "$TOOL" in
	Edit|Write|Read) ;;
	*) exit 0 ;;
esac

# Extract file path from tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
if [[ -z "$FILE_PATH" ]]; then
	exit 0
fi

# Resolve project dir
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
RULES_DIR="$PROJECT_DIR/.claude/rules"

if [[ ! -d "$RULES_DIR" ]]; then
	exit 0
fi

# Make file path relative to project for glob matching
REL_PATH="${FILE_PATH#"$PROJECT_DIR"/}"
# If path didn't change, it wasn't under project dir — skip
if [[ "$REL_PATH" == "$FILE_PATH" ]]; then
	exit 0
fi

# Convert a glob pattern to an extended regex
glob_to_regex() {
	local pattern="$1"
	local regex=""
	local i=0
	local len=${#pattern}

	while (( i < len )); do
		local char="${pattern:$i:1}"
		local next="${pattern:$((i+1)):1}"

		if [[ "$char" == "*" && "$next" == "*" ]]; then
			i=$((i + 2))
			# Skip trailing / after **
			if [[ "${pattern:$i:1}" == "/" ]]; then
				i=$((i + 1))
			fi
			if (( i >= len )); then
				# ** at end of pattern: match any suffix
				regex+=".*"
			else
				# ** at start or middle: match zero or more path segments
				regex+="(.*/)?";
			fi
		elif [[ "$char" == "*" ]]; then
			# * matches anything except /
			regex+="[^/]*"
			i=$((i + 1))
		elif [[ "$char" == "?" ]]; then
			regex+="[^/]"
			i=$((i + 1))
		elif [[ "$char" == "." ]]; then
			regex+="\\."
			i=$((i + 1))
		else
			regex+="$char"
			i=$((i + 1))
		fi
	done

	echo "^${regex}$"
}

MATCHED_RULES=""

for RULE_FILE in "$RULES_DIR"/*.md; do
	[[ -f "$RULE_FILE" ]] || continue

	# Extract frontmatter paths between --- markers
	IN_FRONTMATTER=false
	IN_PATHS=false
	PATTERNS=()

	while IFS= read -r line; do
		if [[ "$line" == "---" ]]; then
			if $IN_FRONTMATTER; then
				break # End of frontmatter
			fi
			IN_FRONTMATTER=true
			continue
		fi

		if ! $IN_FRONTMATTER; then
			continue
		fi

		# Detect "paths:" key
		if [[ "$line" =~ ^paths: ]]; then
			IN_PATHS=true
			continue
		fi

		# If we hit another top-level key, stop reading paths
		if $IN_PATHS && [[ "$line" =~ ^[a-zA-Z] ]]; then
			break
		fi

		# Read path entries (  - "pattern" or   - pattern)
		if $IN_PATHS && [[ "$line" =~ ^[[:space:]]*-[[:space:]]+(.*) ]]; then
			PATTERN="${BASH_REMATCH[1]}"
			# Strip quotes
			PATTERN="${PATTERN#\"}"
			PATTERN="${PATTERN%\"}"
			PATTERN="${PATTERN#\'}"
			PATTERN="${PATTERN%\'}"
			PATTERNS+=("$PATTERN")
		fi
	done < "$RULE_FILE"

	# Match relative path against each pattern
	for PATTERN in "${PATTERNS[@]}"; do
		REGEX=$(glob_to_regex "$PATTERN")

		if echo "$REL_PATH" | grep -qE "$REGEX" 2>/dev/null; then
			# Extract content after frontmatter (skip everything between first --- pair)
			RULE_CONTENT=$(awk 'BEGIN{n=0} /^---$/{n++; next} n>=2{print}' "$RULE_FILE")
			RULE_NAME=$(basename "$RULE_FILE")
			MATCHED_RULES+="
=== Rule: $RULE_NAME ===
$RULE_CONTENT
"
			break # Don't match same rule twice
		fi
	done
done

if [[ -z "$MATCHED_RULES" ]]; then
	exit 0
fi

jq -n --arg ctx "$MATCHED_RULES" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "allow",
    additionalContext: $ctx
  }
}'
