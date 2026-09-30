#!/usr/bin/env bash
# Usage: save-plan.sh [--root <workspace root>] <name> [plan-file]
# Saves a plan to <workspace root>/PLANS/<yyyymmdd-HHMMss>-<kebab-name>.md and prints the path.
# If plan-file is omitted, the plan markdown is read from stdin.
set -euo pipefail
source "$(dirname "$0")/root-state.sh"

die() { echo "save-plan: $*" >&2; exit 1; }

root=
if [[ ${1:-} == --root ]]; then
  [[ $# -ge 2 ]] || die "--root needs a directory"
  root=$2
  shift 2
fi
[[ $# -ge 1 ]] || die "usage: save-plan.sh [--root <workspace root>] <name> [plan-file]"
raw_name=$1
plan_file=${2:-}

# Convert the name to lowercase kebab-case, using only a-z, 0-9 and single hyphens.
name=$(printf '%s' "$raw_name" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//')
name=${name:0:60}
name=${name%-}
[[ -n "$name" ]] || die "plan name '$raw_name' is empty after converting to kebab-case"

if [[ -n "$plan_file" ]]; then
  [[ -f "$plan_file" ]] || die "plan file not found: $plan_file"
  plan=$(cat "$plan_file")
else
  plan=$(cat)
fi
[[ -n "${plan//[[:space:]]/}" ]] || die "plan is empty; nothing saved"

# The workspace root is the directory Claude was launched from, never the shell's current directory:
# Claude's shell often cd's into subfolders, which would scatter PLANS/ directories around the project.
# The root comes from, in order: --root, CLAUDE_PROJECT_DIR (set for hooks), or the root the SessionStart
# hook recorded for CLAUDE_CODE_SESSION_ID (the Bash tool gets that ID). If none is available, fail.
if [[ -z "$root" && -n "${CLAUDE_PROJECT_DIR:-}" ]]; then
  root=$CLAUDE_PROJECT_DIR
fi
if [[ -z "$root" && -n "${CLAUDE_CODE_SESSION_ID:-}" ]]; then
  record=$(root_record_path "$CLAUDE_CODE_SESSION_ID")
  [[ -f "$record" ]] && root=$(<"$record")
fi
[[ -n "$root" ]] || die "cannot tell the workspace root (no --root, no CLAUDE_PROJECT_DIR, and no root recorded for this session); pass --root <dir where claude was launched>"
[[ -d "$root" ]] || die "workspace root is not a directory: $root"
dir="$root/PLANS"
mkdir -p "$dir"

base="$dir/$(date +%Y%m%d-%H%M%S)-$name"
out="$base.md"
n=2
while [[ -e "$out" ]]; do out="$base-$n.md"; n=$((n + 1)); done

# The saved file must be markdown. If the plan has no heading, add one.
if ! grep -qE '^[[:space:]]*#' <<<"$(printf '%s\n' "$plan" | sed '/^[[:space:]]*$/d' | head -n1)"; then
  title=$(awk -F- '{for (i = 1; i <= NF; i++) $i = toupper(substr($i, 1, 1)) substr($i, 2)} 1' <<<"$name")
  plan="# $title"$'\n\n'"$plan"
fi

printf '%s\n' "$plan" >"$out"
echo "$out"
