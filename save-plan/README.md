# save-plan

A Claude Code plugin that saves plans from plan mode to your project:

```
<workspace root>/PLANS/<yyyymmdd-HHMMss>-<plan-name>.md
```

## How it works

1. Make a plan in plan mode and approve it.
2. A `PostToolUse` hook on `ExitPlanMode` fires, and Claude asks you before it does anything else:
   - **Save as "`<auto-name>`", don't execute yet**: saves the plan under a descriptive auto name and stops.
   - **Execute now**: skips saving and starts implementing.
   - **Other**: type your own name. The plan is saved under that name and Claude stops.
3. Ask Claude to execute the plan whenever you're ready.

Rules:
- Plan names are always lowercase kebab-case. A name like `My Cool Plan!` becomes `my-cool-plan`.
- Saved files are always markdown, and the plan is written as-is. If the plan has no heading, one is added.
- Existing files are never overwritten.
- The workspace root is the directory Claude was launched from (`CLAUDE_PROJECT_DIR`), not the shell's current directory at runtime.

You can also save a plan manually with `/save-plan:save-plan [name]`.

## Install

```
/plugin marketplace add /path/to/maharianto-claude-plugins
/plugin install save-plan@maharianto-claude-plugins
```

Requires `bash` and `jq`.

## Files

| Path | Purpose |
|---|---|
| `hooks/hooks.json` | Runs the hook after `ExitPlanMode` is approved |
| `scripts/on-plan-approved.sh` | Stages the approved plan and tells Claude to ask about saving |
| `scripts/save-plan.sh` | Converts the name to kebab-case, adds the timestamp, and writes the file without overwriting |
| `skills/save-plan/SKILL.md` | The manual `/save-plan` command |
