# paste-peek

A Claude Code mod that shows a row of tiles above the prompt for each pasted item in your draft, so you can see what you've pasted before you send it.

![paste-peek's tiles above the prompt, four pasted images in different colors](docs/tiles.png)

Tiles run left to right in paste order:

| Item | Tile |
|---|---|
| Pasted image (`[Image #n]`) | The picture from Claude's image cache, with `[Image #n]` underneath. Where the terminal can't draw pictures (tmux, for one), that label is shown in its place. |
| Pasted long text (`[Pasted text #n …]`) | The label `[Pasted text #n]`. Claude doesn't write the text anywhere before you send it, so it can't be previewed. |
| Pasted path to a file | The first lines of the file, with its name underneath. A binary file shows just its name. |

- Each tile gets a random color (green, blue, orange, yellow, red or purple) for its border and label, kept while the item is in the draft.
- A tile disappears when its tag or path leaves the draft, and all of them clear when you send the prompt.
- A pasted path to an image gets no tile and stays plain text.
- Tiles shrink together to fit the band. The band can't see what's drawn below it, so it keeps `reservedRows` free for that (default 5: [`token-visualizer`](../token-visualizer/README.md)'s band is 4 rows, and Claude draws its own status row under it). Change it in the config menu if you stack something taller.
- With token-visualizer installed, the tiles are always above its meters.
- Another band mod that draws itself on top of the others, or one that never passes the band on, can sit above the tiles or hide them. That order isn't up to this plugin.

## Install

```
/plugin marketplace add maharianto-dev/claude-plugins
/plugin install paste-peek@maharianto-claude-plugins
```

Needs a Claude Code build with mods (function hooks), and `find`, `od`, `head` and `id` on the path. Images are looked up in `$CLAUDE_CODE_TMPDIR`, or `/tmp/claude-<uid>`.

## Files

| Path | Purpose |
|---|---|
| `hooks/hooks.json` | Loads the mod |
| `hooks/register.tsx` | The mod: polls the draft, captures pasted file paths, and renders the row |
| `hooks/tokens.ts` | Finds the `[Image #n]` and `[Pasted text #n …]` tags in the draft |
| `hooks/paths.ts`, `preview.ts` | Tells whether an edit inserted a file path, and builds the file preview |
| `hooks/images.ts`, `png.ts` | Finds Claude's image cache, and reads a PNG's size from its header |
| `hooks/items.ts`, `colors.ts` | Turns the draft into the list of tiles, and picks their colors |
| `hooks/layout.ts` | Fits the tiles to the band |
| `hooks/strip.tsx` | Draws the tile row |
| `hooks/*.test.ts` | Tests, run with `claude plugin test paste-peek` |
| `docs/tiles.png` | The screenshot above |
| `types/index.d.ts` | The mod's state contract |

## Credits

The cache lookup and tile layout ideas come from [claude-image-view](https://github.com/jarrodwatts/claude-image-view) by Jarrod Watts (MIT). Both draw above the prompt for pasted images, so don't install both.
