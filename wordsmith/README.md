# wordsmith

A Claude Code mod that turns a rough prompt into a concise, structured one before Claude sees it. It doesn't fill gaps with guesses. It asks you about each one, then puts the finished prompt in the input box for you to review. It never sends it.

The interview runs beside the main conversation. Claude never sees the questions, the drafts or the file lookups, only the prompt you send in the end.

## Use

Either:

- `/wordsmith <rough prompt>`, for example `/wordsmith add caching to the API client`
- or a normal prompt that addresses Wordsmith by name, `wordsmith` or `ws`: `ws improve this: add caching`, `wordsmith, write a prompt for a release checklist`

A prompt that only mentions the word, like `fix the ws reconnect bug`, goes to Claude as usual. When a prompt names Wordsmith, a quick Haiku check decides whether you're asking for a prompt, and pulls out the rough request. If that check fails, a toast says so and the message goes to Claude unchanged.

Then:

1. A toast shows `wordsmith: drafting…`.
2. When the request depends on facts about the project (language, framework, layout, conventions), an Explore subagent looks them up.
3. Open points become questions with 2–4 options, at most 5 per interview, the ones that matter most first. You can always type your own answer. A lesser point is left out of the prompt, or named as one for Claude to check with you, never guessed.
4. The finished prompt replaces the input box. It is Markdown with `## Role`, `## Goal`, `## Context`, `## Task`, `## Constraints` and `## Validation`, at most 300 words. Edit it, or press Enter to send it.

If anything fails (a model or subagent error, a reply that doesn't parse, no finished prompt after 6 drafts, a question you dismiss), a toast shows `wordsmith failed: <reason>` and the interview stops. When the interview started from a typed prompt, that prompt is put back in the input box, so nothing is lost.

## Your own drafting agent (optional)

Wordsmith drafts with your session's model and effort, using its own rules as the system prompt. If you haven't sent a prompt in the session yet, the effort is unknown, and the model's default applies.

To draft with your own agent, add `wordsmith.md` in either location. The first one found is used:

1. `<project>/.claude/agents/wordsmith.md`
2. `~/.claude/agents/wordsmith.md`

Your agent's system prompt, model and effort apply, and Wordsmith's rules come in its task message. For example:

```markdown
---
name: wordsmith
description: Drafts structured prompts for the wordsmith plugin.
model: sonnet
effort: medium
tools: Read, Grep, Glob
---

You are a careful prompt engineer. Prefer plain words and short sentences.
Follow the rules in the task exactly and reply with the JSON they ask for.
```

Each draft starts a new subagent, which shows in `/tasks`. With file tools, the agent may look things up itself instead of asking for an Explore search.

## Install

```
/plugin marketplace add maharianto-dev/claude-plugins
/plugin install wordsmith@maharianto-claude-plugins
```

Needs a Claude Code build with mods (function hooks).

## Files

| Path | Purpose |
|---|---|
| `hooks/hooks.json` | Loads the mod |
| `hooks/register.ts` | The mod: the `/wordsmith` command, the prompt trigger, the interview loop, and the subagent waits |
| `hooks/flow.ts` | One interview's state, and the next step after each draft (look up, ask, redraft, deliver, fail) |
| `hooks/rules.ts` | The drafting rules and the drafting message |
| `hooks/draft.ts` | Parses and checks the drafter's JSON reply, and counts words |
| `hooks/trigger.ts` | Finds the trigger words, and builds and parses the Haiku check |
| `hooks/seal.ts` | Name matching |
| `hooks/agents.ts` | Where the drafting agent may be, and the Explore task |
| `hooks/*.test.ts` | Tests, run with `claude plugin test wordsmith` |
