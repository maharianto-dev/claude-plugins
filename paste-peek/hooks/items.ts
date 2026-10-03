import type { FilePaste, Item } from '../types'
import { baseName } from './paths'
import { parseTokens } from './tokens'

// A cached image: where it is and its size.
export type ImageInfo = { path: string; width: number; height: number }

// The draft's items in draft order. `images` holds what the cache lookup found, by tag number;
// `colorOf` gives an item's color by its key (its label, or a file's path), the same one every time.
export const buildItems = (
  draft: string,
  files: readonly FilePaste[],
  images: ReadonlyMap<number, ImageInfo>,
  colorOf: (key: string) => string,
): Item[] => {
  const found: { at: number; item: Item }[] = []
  for (const t of parseTokens(draft)) {
    if (t.kind === 'text') {
      const label = `[Pasted text #${t.n}]`
      found.push({ at: t.at, item: { label, caption: label, color: colorOf(label) } })
      continue
    }
    const info = images.get(t.n)
    const label = `[Image #${t.n}]`
    const item: Item = { label, caption: label, color: colorOf(label) }
    found.push({ at: t.at, item: info ? { ...item, source: info.path, width: info.width, height: info.height } : item })
  }
  for (const f of files) {
    const at = draft.indexOf(f.needle)
    if (at < 0) continue
    const name = baseName(f.path)
    const item: Item = { label: name, caption: name, color: colorOf(f.path) }
    found.push({ at, item: f.lines ? { ...item, lines: f.lines } : item })
  }
  return found.sort((a, b) => a.at - b.at).map(f => f.item)
}
