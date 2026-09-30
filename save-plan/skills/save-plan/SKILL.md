---
name: save-plan
description: Save a plan made in plan mode to PLANS/<yyyymmdd-HHMMss>-<name>.md in the workspace root, using an auto-generated descriptive name or one the user gives. Use this when the user runs /save-plan [name] or says "save the plan", "keep this plan" or "store the plan", even if they don't name the skill.
argument-hint: "[plan name]"
---

# Save Plan

This skill saves the latest plan from this session as a markdown file:
`<workspace root>/PLANS/<yyyymmdd-HHMMss>-<name>.md`

This plugin's hook already offers to save the plan right after the user approves it in plan mode. Use this skill when the user asks to save a plan manually.

## Name

- If the user gives a name (`$ARGUMENTS` or in their message), use it. The script converts it to lowercase kebab-case.
- If not, pick an auto name: a lowercase kebab-case slug of 2 to 5 descriptive words that sums up the plan's goal, e.g. `add-oauth-login`.

## Find the plan

Use the first source that exists:
1. The staged plan for this session: `${CLAUDE_PLUGIN_DATA}/save-plan/<session_id>.md`. If `CLAUDE_PLUGIN_DATA` is unset, look in `${TMPDIR:-/tmp}/save-plan/`.
2. The newest file in `~/.claude/plans/`, but only if it is this session's plan.
3. The plan in the conversation. Pipe its markdown through stdin.

If there is no plan, say so. Don't create an empty file.

## Save

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/save-plan.sh" "<name>" "<plan file>"
# or: printf '%s\n' "<plan markdown>" | "${CLAUDE_PLUGIN_ROOT}/scripts/save-plan.sh" "<name>"
```

The workspace root is always the directory Claude was launched from, never the shell's current directory, even if you have `cd`'d into a subfolder. The script finds it on its own from the root the plugin's SessionStart hook recorded for this session. Don't `cd` first, and don't pass `--root $PWD`. If the script fails because it can't determine the root, pass `--root <the primary working directory shown at session start>` as the first argument. It adds a timestamp, never overwrites an existing file, makes sure the file is markdown, and prints the saved path. Tell the user that path in one line. Don't start executing the plan unless the user asks.
