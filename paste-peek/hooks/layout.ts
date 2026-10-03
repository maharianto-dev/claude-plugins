import type { Item } from '../types'

export const MAX_CONTENT_ROWS = 8
export const TEXT_COLUMNS = 24
export const GAP = 1
// A tile's rows beyond its content: two border rows and the caption.
export const CHROME_ROWS = 3

export type Placed = {
  item: Item
  kind: 'image' | 'lines' | 'label'
  // Content size inside the border.
  columns: number
  rows: number
  // Outer width, border included.
  width: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

const place = (item: Item, rows: number): Placed => {
  if (item.source !== undefined && item.width && item.height) {
    // A terminal cell is about twice as tall as wide.
    const columns = clamp(Math.round((2 * rows * item.width) / item.height), 1, 255)
    return { item, kind: 'image', columns, rows, width: Math.max(columns, item.caption.length) + 2 }
  }
  if (item.lines) {
    const widest = Math.max(1, ...item.lines.map(l => l.length))
    const columns = Math.min(TEXT_COLUMNS, widest)
    return { item, kind: 'lines', columns, rows: clamp(item.lines.length, 1, rows), width: Math.max(columns, item.caption.length) + 2 }
  }
  return { item, kind: 'label', columns: item.label.length, rows: 1, width: item.label.length + 2 }
}

const rowWidth = (placed: readonly Placed[]) =>
  placed.reduce((sum, p) => sum + p.width, 0) + GAP * Math.max(0, placed.length - 1)

// All tiles shrink together to the tallest content height that fits `budgetRows` x `columns`.
// If even 1-row content is too wide, the tiles stay at 1 row.
export const fitTiles = (items: readonly Item[], budgetRows: number, columns: number): Placed[] => {
  let rows = clamp(budgetRows - CHROME_ROWS, 1, MAX_CONTENT_ROWS)
  let placed = items.map(i => place(i, rows))
  while (rows > 1 && rowWidth(placed) > columns) {
    rows -= 1
    placed = items.map(i => place(i, rows))
  }
  return placed
}
