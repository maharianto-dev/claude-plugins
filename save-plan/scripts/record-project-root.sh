#!/usr/bin/env bash
# SessionStart hook. It records the directory Claude was launched from (CLAUDE_PROJECT_DIR) for this session.
# Hooks get CLAUDE_PROJECT_DIR, but Claude's Bash tool does not. save-plan.sh reads this record, so a
# manual /save-plan still uses the launch directory even after the shell has cd'd somewhere else.
set -euo pipefail
source "$(dirname "$0")/root-state.sh"

input=$(cat)
session_id=$(jq -r '.session_id // empty' <<<"$input")
[[ -n "$session_id" ]] || { echo "save-plan: SessionStart input has no session_id" >&2; exit 1; }
[[ -n "${CLAUDE_PROJECT_DIR:-}" ]] || { echo "save-plan: CLAUDE_PROJECT_DIR is not set for the SessionStart hook" >&2; exit 1; }

mkdir -p "$root_state_dir"
printf '%s\n' "$CLAUDE_PROJECT_DIR" >"$(root_record_path "$session_id")"
