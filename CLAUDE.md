# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A Claude Code plugin marketplace (`.claude-plugin/marketplace.json`) with one folder per plugin:

- `save-plan/`: saves plan-mode plans to `<workspace root>/PLANS/<yyyymmdd-HHMMss>-<kebab-name>.md`. It has a skill, classic command hooks (bash), and a mod.
- `token-visualizer/`: a mod only. It draws a band above the prompt with context and rate-limit meters.
- `paste-peek/`: a mod only. It draws tiles above the prompt for pasted images, long text and file paths. It sits on top of token-visualizer's band.
- `wordsmith/`: a mod only. It interviews the user to turn a rough prompt into a structured one, and puts the result in the input box unsent.

A plugin's version is in two places, its own `.claude-plugin/plugin.json` and its entry in `marketplace.json`. Bump both together, and keep the descriptions in sync.

## Two kinds of hooks

- **Classic command hooks**: `hooks/hooks.json` under `"hooks"`, running scripts in `scripts/` that read the hook JSON on stdin (they need `jq`).
- **Mods (function hooks)**: `hooks/hooks.json` under `"modules": ["./register.ts"]`. This is a TypeScript module exporting `register(on)`, and it runs in the engine's own sandbox (no Node, no DOM; everything goes through `$`). One `hooks.json` can hold both keys, as save-plan's does.

Mod rules that `claude plugin validate` enforces or that bit us:
- `$` may be used only in the file that registers the hooks. Never pass `$` to an imported function. Keep imported modules pure (they build arguments or parse results), and make every `$.noun.method(...)` call in `register.ts`.
- `$.state` values need a contract in `types/index.d.ts` (`interface PluginState` under the plugin's name), named as `"types"` in `plugin.json`.
- The API reference is the generated `.claude-plugin/types/claude-code/index.d.ts`, matching the installed Claude Code version. Grep it rather than guessing. The engine writes that folder (it carries its own `.gitignore`) when it loads the plugin from disk. The plugin's `tsconfig.json` extends `./.claude-plugin/types/tsconfig.json`, so a plugin the engine hasn't loaded yet can't be type-checked.

## Commands

Run from the repo root, with `<plugin>` being `save-plan`, `token-visualizer`, `paste-peek` or `wordsmith`:

```bash
claude plugin validate <plugin>        # manifest + hooks module check: what it hooks and calls, what the engine would refuse
claude plugin test <plugin>            # runs <plugin>/hooks/*.test.ts against the engine
bunx -p typescript tsc -p <plugin>     # type-check a mod (no global tsc installed)
claude --plugin-dir <plugin>           # run a session with the plugin loaded from disk; saves hot-reload it
```

There is no single-test filter: `claude plugin test` runs every `*.test.ts` in the plugin. The repo has no linter and no E2E harness. The closest checks are `validate` plus `tsc`.

Tests import from `claude-code/testing` (`test(name, async ($, on) => ...)`). Hooks registered on the test's `on` sit beneath the plugin and stand in for the engine. A hook that answers a `$` call (`fs.read`, `model.complete`, `process.run`, `session.root`, `ui.toast`, ...) returns `{ value: ... }`, and any event the plugin raises needs such an answer, `prompt.attachment` included.

## Manual E2E in a real session

Drive an interactive session in tmux (a bare pty stalls, because the TUI expects terminal replies):

```bash
tmux new-session -d -s e2e -x 180 -y 50 -c <empty git dir> "claude --plugin-dir <abs plugin path> --permission-mode plan '<prompt>'"
tmux capture-pane -p -t e2e        # read the screen; tmux send-keys -t e2e ... to act
```

- The folder-trust prompt defaults to "No, exit". Send `Down` then `Enter`.
- On the plan review screen, the "No, keep planning" option is an input row labelled "Tell Claude what to change". Reach it with `Down Down`, type with `send-keys -l`, then press `Enter`.

## save-plan architecture

- **Workspace root**: always the directory Claude was launched from, never the shell's cwd. Claude's Bash tool doesn't get `CLAUDE_PROJECT_DIR`, so the `SessionStart` hook (`record-project-root.sh`) records it per session under `${XDG_STATE_HOME:-~/.local/state}/claude-save-plan/sessions/<session_id>.root` (path defined in `root-state.sh`). `save-plan.sh` resolves the root in this order: `--root`, then `CLAUDE_PROJECT_DIR`, then that record. If none is available it fails rather than falling back to cwd.
- `scripts/save-plan.sh` is the only writer. It kebab-cases the name (max 60 characters), adds the timestamp, never overwrites (it appends `-2`, `-3`, ...), and adds a `#` heading when the plan has none. Every save path goes through it.
- There are three ways to save:
  1. **On approval**: a classic `PostToolUse` hook on `ExitPlanMode` (`on-plan-approved.sh`) stages the plan and tells Claude to ask, through AskUserQuestion, whether to save or execute.
  2. **On rejection (the mod)**: `hooks/register.ts` records the plan file path from the `plan_mode` prompt attachment (`detail.planFilePath`, main loop only) in `$.state`. It wraps `tool.call` for `ExitPlanMode`. When the user rejects with typed text, the model reads `...the user said:\n<text>`, parsed by `feedback.ts`. If the text has a save-like word, Haiku (`classify.ts`) decides whether it's a request to save the plan, and gives the name. On a save it runs `save-plan.sh` and replaces the result with a `deny` telling Claude not to build. On a failure it shows a toast, saves nothing, and tells Claude to report the failure. The rejection-text format comes from the Claude Code build, so recheck `feedback.ts` when that wording changes.
  3. **Manually**: the `/save-plan [name]` skill (`skills/save-plan/SKILL.md`).

## paste-peek architecture

- **Stacking in `AbovePrompt`**: all plugins share one band and chain through `ui.render`, in an order the plugin doesn't control. paste-peek draws `<Box column>{tiles}{await next(e)}</Box>` (above what runs after it) and token-visualizer draws `<Box column>{await next(e)}{meters}</Box>` (below it), so tiles are on top whichever runs first. A mod that skips `next(e)` hides the ones after it.
- **Polling**: image pastes and long text pastes raise no `prompt.edit`, so a 200 ms `clock.every` reads `$.prompt.read()`, parses the `[Image #n]` / `[Pasted text #n …]` tags (`tokens.ts`) and writes `$.state` only when the items change. The text of a long paste isn't readable before sending, so its tile is a label.
- **Image cache**: Claude writes pasted images to `<tmp>/<project>/<session_id>/images/<n>.png`, `<tmp>` being `$CLAUDE_CODE_TMPDIR` or `/tmp/claude-<uid>`. `images.ts` builds the `find` argv; the size comes from the PNG header via `od` (`png.ts`), so large files never cross `$.fs.read`'s 4 MiB limit. The terminal reads the file itself (`Image` with `{ file, format: 'png' }`), and shows `alt` where it can't draw pictures (tmux).
- **File paths**: a `prompt.edit` hook calls `next(e)` first, then in the background checks whether the inserted text is one absolute or `~` path to a regular, non-image file. It keeps the path and the head of the file (`head -c`, `preview.ts`) in `$.state`. The item stays while that text is in the draft.
- **Height**: tiles fit `maxRows − reservedRows` (`userConfig.reservedRows`, default 5: token-visualizer's band is a rule plus 3 rows, and the engine's own status row sits under it) by `bodyColumns`, shrinking together (`layout.ts`). The mod can't measure what is below it.
- Every `$` call is in `register.tsx` (helpers that take `$` are declared at the top of that file); `tokens`, `paths`, `preview`, `png`, `images`, `items` and `layout` are pure.

## wordsmith architecture

- **Entry points**: `/wordsmith <prompt>` (`command.run`, registered from `session.start`), or a composer prompt with a `wordsmith`/`ws` token, or a third name matched only by digest (`seal.ts`, salted and repeated SHA-256). That name is never written in plain text anywhere in the repo. `trigger.ts` replaces it with `wordsmith` before the Haiku check sees the text. A trigger prompt returns `{ drop }`. A failed check sends the prompt on unchanged.
- **Interview**: it runs in the background from `register.ts` (`interview`), and `flow.ts` decides each step from the parsed draft (`draft.ts`): context first (an Explore spawn), then questions (`$.ui.ask`, one at a time, at most `MAX_QUESTIONS` = 5 per interview, cut in `nextStep` when a draft asks past it), then a shorten redraft past 300 words, and fail after 6 drafts. Each draft is a fresh call that carries the whole history (`rules.ts`). The result goes in with `$.prompt.fill({ mode: 'replace' })`.
- **Drafter**: `<root>/.claude/agents/wordsmith.md`, then `~/.claude/agents/wordsmith.md`, is spawned with the rules in its task. Without one, `$.model.complete` uses the session model and the main loop's last effort, taken from `turn.step`.
- **Subagents**: `$.agent.spawn` resolves on start, and the answer is that agent's `turn.complete`, keyed by `agentId` (`ctx.waiting`; an end before the id is known goes to `ctx.early`). Plugins can't raise the Agent tool through `$.tool.call`. The finished agent's report also reaches the main loop as a `peer` prompt `<agent-message from="<agentId>">`, which `prompt.submit` drops for ids Wordsmith spawned.
- **Tests**: the test kit strips `agentId` from a test's `agent.spawn` answer, so engine tests only check spawn requests. Answer delivery is covered by the manual E2E.
