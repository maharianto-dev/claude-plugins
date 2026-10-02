// A cell is a run of styled text; the grid only needs how wide it is.
export type Seg = { text: string; color?: string; dim?: boolean }
export type Cell = readonly Seg[]

export const cellWidth = (cell: Cell): number => cell.reduce((sum, s) => sum + s.text.length, 0)

// One width per column: the widest cell in it, across every row.
export const columnWidths = (rows: readonly (readonly Cell[])[]): number[] =>
  rows.reduce<number[]>(
    (widths, row) => row.map((cell, i) => Math.max(widths[i] ?? 0, cellWidth(cell))),
    [],
  )
