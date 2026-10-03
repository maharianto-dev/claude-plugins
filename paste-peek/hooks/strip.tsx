import type { Elements } from 'claude-code'

import type { Placed } from './layout'

// Box, Text and Image come from $.ui.resolve; this module never touches $.
type Parts = Pick<Elements['terminal'], 'Box' | 'Text' | 'Image'>

export const Strip = ({ Box, Text, Image }: Parts, placed: readonly Placed[]) => {
  const content = (p: Placed) =>
    p.kind === 'image' ? (
      <Image source={{ file: p.item.source!, format: 'png' }} columns={p.columns} rows={p.rows} alt={p.item.label} />
    ) : (
      <Box flexDirection="column" width={p.columns}>
        {(p.item.lines ?? []).slice(0, p.rows).map(line => <Text wrap="truncate-end">{line === '' ? ' ' : line}</Text>)}
      </Box>
    )

  const tile = (p: Placed) =>
    p.kind === 'label' ? (
      <Box borderStyle="round" borderColor={p.item.color} width={p.width}>
        <Text color={p.item.color} wrap="truncate-end">{p.item.label}</Text>
      </Box>
    ) : (
      <Box flexDirection="column" width={p.width}>
        <Box borderStyle="round" borderColor={p.item.color} width={p.width}>{content(p)}</Box>
        <Text color={p.item.color} wrap="truncate-end">{p.item.caption}</Text>
      </Box>
    )

  return (
    <Box flexDirection="row" alignItems="flex-end" gap={1}>
      {placed.map(tile)}
    </Box>
  )
}
