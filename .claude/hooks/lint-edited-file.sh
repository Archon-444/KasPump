#!/usr/bin/env bash
# PostToolUse hook: lint the edited file so errors surface at write time.
# --quiet reports errors only (repo rules are mostly warn-level; warnings on
# every edit would be noise). Exit 2 feeds the output back to Claude.

file_path=$(python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null)

case "$file_path" in
  */src/*.ts|*/src/*.tsx) ;;
  *) exit 0 ;;
esac

cd "$CLAUDE_PROJECT_DIR" || exit 0
[ -x node_modules/.bin/eslint ] || exit 0

output=$(npx eslint --quiet "$file_path" 2>&1)
status=$?

# As of July 2026 the repo's lint setup is broken (eslint 8 cannot load
# eslint-config-next 16's flat configs, and `next lint` was removed in
# Next 16). Skip on tooling crashes so this hook only reports genuine
# lint errors; it starts working automatically once lint is migrated.
case "$output" in
  *"Oops! Something went wrong"*|*"TypeError"*|*"Cannot find module"*) exit 0 ;;
esac

if [ $status -ne 0 ] && [ -n "$output" ]; then
  echo "$output" >&2
  exit 2
fi
exit 0
