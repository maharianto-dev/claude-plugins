import type { Elements } from 'claude-code'

import type { Cell } from './layout'
import { cellWidth, columnWidths } from './layout'

// Longer than any terminal; truncate-end cuts it at the screen edge.
const RULE = '─'.repeat(500)

// Box and Text come from $.ui.resolve; this module never touches $.
type Parts = Pick<Elements['terminal'], 'Box' | 'Text'>

export const Band = ({ Box, Text }: Parts, rows: readonly (readonly Cell[])[]) => {
  const widths = columnWidths(rows)
  const cell = (c: Cell, col: number) => (
    <Text>
      {c.map(s => <Text color={s.color} dimColor={s.dim}>{s.text}</Text>)}
      {' '.repeat(widths[col]! - cellWidth(c))}
    </Text>
  )
  return (
    <Box flexDirection="column">
      <Text dimColor wrap="truncate-end">{RULE}</Text>
      {rows.map(row => (
        <Box flexDirection="row" paddingRight={2}>
          {row.map((c, col) => (
            <Box flexDirection="row">
              {col > 0 && <Text dimColor> │ </Text>}
              {cell(c, col)}
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  )
}
