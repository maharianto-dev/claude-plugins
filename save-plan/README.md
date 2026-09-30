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
- The workspace root is always the directory Claude was launched from, never the shell's current directory. Claude's Bash tool doesn't get `CLAUDE_PROJECT_DIR`, so the hooks capture it instead:
  - After plan approval, the root is written into the save command as `--root`.
  - At session start, a hook records the root for the session, so a manual `/save-plan` finds it through `CLAUDE_CODE_SESSION_ID`.
  - If the root can't be determined, the script fails. It never falls back to the current directory.

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
| `hooks/hooks.json` | Records the workspace root at session start, and runs the hook after `ExitPlanMode` is approved |
| `scripts/record-project-root.sh` | `SessionStart` hook that records `CLAUDE_PROJECT_DIR` for the session under `${XDG_STATE_HOME:-~/.local/state}/claude-save-plan/sessions/` |
| `scripts/root-state.sh` | Shared helper that sets where the per-session roots are recorded |
| `scripts/on-plan-approved.sh` | Stages the approved plan and tells Claude to ask about saving |
| `scripts/save-plan.sh` | Resolves the workspace root (`--root`, then `CLAUDE_PROJECT_DIR`, then the recorded session root), converts the name to kebab-case, adds the timestamp, and writes the file without overwriting |
| `skills/save-plan/SKILL.md` | The manual `/save-plan` command |
