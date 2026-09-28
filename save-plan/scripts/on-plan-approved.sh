#!/usr/bin/env bash
# PostToolUse hook for ExitPlanMode. This hook only runs after the user approves the plan.
# It stages the approved plan and tells Claude to ask whether to save it and hold off executing.
set -euo pipefail

input=$(cat)
session_id=$(jq -r '.session_id // "unknown"' <<<"$input")

# Find the plan text. Try the tool input first, then the tool response, then the newest plan file.
plan=$(jq -r '.tool_input.plan // .tool_response.plan // empty' <<<"$input")
if [[ -z "$plan" ]]; then
  plan_path=$(jq -r '.tool_response.filePath // .tool_response.planFilePath // empty' <<<"$input")
  if [[ -z "$plan_path" || ! -f "$plan_path" ]]; then
    plan_path=$(ls -t "$HOME"/.claude/plans/*.md 2>/dev/null | head -n1 || true)
  fi
  [[ -n "$plan_path" && -f "$plan_path" ]] && plan=$(cat "$plan_path")
fi
[[ -z "$plan" ]] && exit 0 # Nothing to offer.

stage_dir="${CLAUDE_PLUGIN_DATA:-${TMPDIR:-/tmp}}/save-plan"
mkdir -p "$stage_dir"
staged="$stage_dir/$session_id.md"
printf '%s\n' "$plan" >"$staged"

save_script="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}/scripts/save-plan.sh"

read -r -d '' context <<EOF || true
[save-plan plugin] The user approved the plan. Before you do anything else (no edits, no commands), call AskUserQuestion once.
- question: "Execute the plan now, or save it and stop here?"
- header: "Plan"
- options (in this order):
  1. label: 'Save as "<auto-name>", don't execute yet'. description: "Saves to PLANS/<timestamp>-<auto-name>.md and stops. Type your own name under Other to use it instead."
  2. label: "Execute now". description: "Start implementing without saving."
Replace <auto-name> with a descriptive lowercase kebab-case slug of 2 to 5 words that sums up the plan's goal (e.g. add-oauth-login).

Then do one of these:
- If the user picks the Save option, or types a name under Other, run:
  "$save_script" "<name>" "$staged"
  <name> is the auto name, or the text the user typed (the script converts it to kebab-case). Report the saved path in one line and END YOUR TURN. Do not execute the plan. The user will ask when they want it executed.
- If the user picks "Execute now", do not save. Implement the plan as usual.
EOF

jq -n --arg ctx "$context" '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $ctx}}'
