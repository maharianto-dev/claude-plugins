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

### Save without approving

On the plan review screen, pick **No, keep planning** and type a save request in its box, in any wording:

- `save it` saves under a descriptive auto name
- `save as new cool feature`, `save using the name new cool feature`, `keep this one, call it cool feature v2`

The plugin's mod saves the plan to `PLANS/<timestamp>-<name>.md`, shows the path in a toast, and tells Claude not to build. You stay in plan mode. Feedback that only changes the plan, like `save the user data before the API call`, goes to Claude as usual.

How it works: the mod reads what you typed when you reject the plan. If it has a word like save, keep, store, name or call, a small model (Haiku) decides whether it's a save request and picks out the name. If that call or the save fails, the mod shows the error in a toast, saves nothing, and tells Claude to report the failure and wait. Don't press shift+tab in that box: it approves the plan with your text.

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

Requires `bash` and `jq`. The save-without-approving mod needs a Claude Code build with mods (function hooks).

## Files

| Path | Purpose |
|---|---|
| `hooks/hooks.json` | Records the workspace root at session start, runs the hook after `ExitPlanMode` is approved, and loads the mod |
| `hooks/register.ts` | The mod: tracks the plan file and saves the plan when you reject it with a save request |
| `hooks/feedback.ts` | Pulls the typed text out of a rejection, and screens it for save-like words |
| `hooks/classify.ts` | The model call that decides whether the text is a save request, and parses its answer |
| `hooks/save.ts` | The `save-plan.sh` command the mod runs, and reading its result |
| `hooks/*.test.ts` | Tests for the mod, run with `claude plugin test save-plan` |
| `types/index.d.ts` | The mod's state contract |
| `scripts/record-project-root.sh` | `SessionStart` hook that records `CLAUDE_PROJECT_DIR` for the session under `${XDG_STATE_HOME:-~/.local/state}/claude-save-plan/sessions/` |
| `scripts/root-state.sh` | Shared helper that sets where the per-session roots are recorded |
| `scripts/on-plan-approved.sh` | Stages the approved plan and tells Claude to ask about saving |
| `scripts/save-plan.sh` | Resolves the workspace root (`--root`, then `CLAUDE_PROJECT_DIR`, then the recorded session root), converts the name to kebab-case, adds the timestamp, and writes the file without overwriting |
| `skills/save-plan/SKILL.md` | The manual `/save-plan` command |
