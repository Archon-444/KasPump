#!/usr/bin/env bash
# PreToolUse hook: block Edit/Write on secrets and generated files.
# Exit 2 blocks the tool call and feeds stderr back to Claude.

file_path=$(python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null)
[ -z "$file_path" ] && exit 0

base=$(basename "$file_path")

case "$base" in
  *.example) exit 0 ;;
  .env|.env.*)
    echo "Blocked: $file_path may contain secrets (RPC keys, deployer private key). Edit it manually outside Claude." >&2
    exit 2
    ;;
esac

case "$file_path" in
  */typechain-types/*|typechain-types/*)
    echo "Blocked: typechain-types/ is generated. Run 'npm run compile' to regenerate it from the contracts instead." >&2
    exit 2
    ;;
  */artifacts/*.json|artifacts/*|*/cache/solidity-files-cache.json)
    echo "Blocked: Hardhat build output is generated. Run 'npm run compile' instead of editing it." >&2
    exit 2
    ;;
esac

exit 0
