// One tile of the row: a picture from Claude's image cache, a file's first lines, or just a label.
export type Item = {
  // The tag as it reads in the draft ("[Image #3]"), or the file name.
  label: string
  // Drawn under a picture or a preview.
  caption: string
  // Border and text color, picked at random when the item first shows up.
  color: string
  // Absolute path of the cached PNG, with its pixel size.
  source?: string
  width?: number
  height?: number
  lines?: string[]
}

// A pasted path to a non-image file, kept while its text stays in the draft.
export type FilePaste = {
  // The text as it sits in the draft.
  needle: string
  path: string
  // The head of the file; null when it isn't text.
  lines: string[] | null
}

declare module 'claude-code' {
  interface PluginState {
    'paste-peek': { 'items-v1': Item[]; 'files-v1': FilePaste[] }
  }
}
