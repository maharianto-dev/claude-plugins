#!/usr/bin/env bash
# Usage: save-plan.sh <name> [plan-file]
# Saves a plan to <workspace root>/PLANS/<yyyymmdd-HHMMss>-<kebab-name>.md and prints the path.
# If plan-file is omitted, the plan markdown is read from stdin.
set -euo pipefail

die() { echo "save-plan: $*" >&2; exit 1; }

[[ $# -ge 1 ]] || die "usage: save-plan.sh <name> [plan-file]"
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

# The workspace root is the directory Claude was launched from (CLAUDE_PROJECT_DIR),
# not the shell's current directory at runtime. Fall back to $PWD only if it is unset.
root=${CLAUDE_PROJECT_DIR:-$PWD}
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
