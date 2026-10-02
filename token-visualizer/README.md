# token-visualizer

A Claude Code mod that draws a band above the prompt, so you can see how much room and budget you have left without leaving the session.

![The token-visualizer band above the prompt, after one reply](docs/band.png)

The band is a 3 x 3 grid that redraws every second:

| | Column 1 | Column 2 | Column 3 |
|---|---|---|---|
| Row 1 | `ctx`: context window use, as tokens used/total | `5h`: five-hour usage limit, with its reset time | `week`: weekly usage limit, with its reset time |
| Row 2 | | `pace` for the 5h limit | `pace` for the weekly limit |
| Row 3 | `cache`: prompt cache TTL countdown | `hit`: cache hit rate for the last request, and `Σ` for the session | `session`: time since the session started |

- **Colors**: `ctx`, `5h` and `week` go from blue to yellow to red as they fill up. `cache` and `hit` go the other way: blue when high, red when low.
- **pace** compares your usage with an even burn through the window. It shows the ideal usage right now, whether you're over or under it, and the usage you'll reach by the reset (`proj`) if you keep this rate. A projection above 100% is shown in red.
- **cache** counts down the time left on the prompt cache. It restarts after each request and reads `cold` once it has expired. The TTL (5 minutes or 1 hour) is read from the transcript after the first turn.
- The limits show `n/a` when Claude Code has no data for them, and the band stays after `/clear`.

## Install

```
/plugin marketplace add maharianto-dev/claude-plugins
/plugin install token-visualizer@maharianto-claude-plugins
```

Needs a Claude Code build with mods (function hooks). The mod uses `tail` to read the cache TTL from the transcript.

## Files

| Path | Purpose |
|---|---|
| `hooks/hooks.json` | Loads the mod |
| `hooks/register.tsx` | The mod: ticks the clock, tracks cache use, reads the TTL, and renders the band |
| `hooks/band.tsx` | Lays the cells out as aligned columns |
| `hooks/cells.ts` | Builds each cell of the grid |
| `hooks/layout.ts`, `format.ts`, `color.ts` | Column widths, number and time text, meter colors |
| `hooks/usage.ts` | Turns the session's usage into the percentages the band shows |
| `hooks/pace.ts` | Ideal usage, over/under verdict and projection |
| `hooks/cache.ts`, `transcript.ts` | Cache countdown and hit rate, and reading the TTL from the transcript |
| `hooks/*.test.ts` | Tests, run with `claude plugin test token-visualizer` |
| `docs/band.png` | The screenshot above |
| `types/index.d.ts` | The mod's state contract |
