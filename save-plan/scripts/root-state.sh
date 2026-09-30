#!/usr/bin/env bash
# Shared helper, sourced by the other scripts. It defines where each session's workspace root is recorded.
# The path does not depend on CLAUDE_PLUGIN_DATA, because Claude's Bash tool does not get that variable,
# while hooks do. Hooks and save-plan.sh must agree on this path.
root_state_dir="${XDG_STATE_HOME:-$HOME/.local/state}/claude-save-plan/sessions"

root_record_path() { printf '%s/%s.root' "$root_state_dir" "$1"; }
