import type { Elements, RenderChildren } from 'claude-code'

import type { Seg } from './layout'
import type { Metric } from './metrics'
import type { Tier } from './tier'
import { cardsPerRow, showDetail, showPace } from './tier'

// Box, Text and Svg come from $.ui.resolve; this module never touches $.
type Parts = Pick<Elements['desktop'], 'Box' | 'Text' | 'Svg'>

const TRACK = '#808896'
const PAD = 1
const GAP = 3
// Pixels per cell, a little under a code font's advance so the line never overflows its card.
const PX = 7
const BAR_HEIGHT = 4

const segs = (Text: Parts['Text'], list: readonly Seg[]) => (
  <Text wrap="truncate-end">
    {list.map(s => <Text color={s.color} dimColor={s.dim}>{s.text}</Text>)}
  </Text>
)

// A thin rounded line: a faint track and the used part over it, in the meter's color.
const Line = ({ Svg }: Parts, m: Metric, cells: number) => {
  const w = cells * PX
  const used = m.percent === null ? 0 : Math.round((Math.min(100, Math.max(0, m.percent)) / 100) * w)
  const color = m.color ?? TRACK
  const r = BAR_HEIGHT / 2
  const source =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${BAR_HEIGHT}" viewBox="0 0 ${w} ${BAR_HEIGHT}">` +
    `<rect width="${w}" height="${BAR_HEIGHT}" rx="${r}" fill="${color}" fill-opacity="0.22"/>` +
    (used > 0 ? `<rect width="${Math.max(used, BAR_HEIGHT)}" height="${BAR_HEIGHT}" rx="${r}" fill="${color}"/>` : '') +
    '</svg>'
  return <Svg source={source} alt={`${m.label} ${m.value}`} width={w} height={BAR_HEIGHT} />
}

// Label, detail and value share one row; the line sits right under it. Fixed width, so columns line up across rows.
const Card = (parts: Parts, m: Metric, tier: Tier, width: number) => {
  const { Box, Text } = parts
  return (
    <Box flexDirection="column" width={width} flexShrink={0}>
      <Box flexDirection="row" gap={1}>
        <Text dimColor>{m.label}</Text>
        <Box flexGrow={1} flexShrink={1} minWidth={0}>
          {showDetail(tier) && m.detail !== undefined && <Text dimColor wrap="truncate-end">{m.detail}</Text>}
        </Box>
        <Text color={m.color} bold>{m.value}</Text>
      </Box>
      {Line(parts, m, width)}
    </Box>
  )
}

const Slot = ({ Box }: Parts, width: number, child?: RenderChildren) => (
  <Box flexDirection="column" width={width} flexShrink={0}>{child}</Box>
)

const chunk = <T,>(list: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size))

const cardWidth = (columns: number, per: number): number =>
  Math.max(8, Math.floor((columns - 2 * PAD - GAP * (per - 1)) / per))

// The terminal's 3 x 3 grid: ctx, 5h, week; the pace lines under the limits; cache, hit, clock and session.
const wideGrid = (parts: Parts, metrics: readonly Metric[], footer: readonly Seg[], tier: Tier, width: number) => {
  const { Box, Text } = parts
  const [ctx, five, week, cache, hit] = metrics as [Metric, Metric, Metric, Metric, Metric]
  const row = (cells: RenderChildren[]) => <Box flexDirection="row" gap={GAP}>{cells}</Box>
  const pace = (m: Metric) => Slot(parts, width, m.pace !== undefined && showPace(tier) ? segs(Text, m.pace) : undefined)
  return [
    row([ctx, five, week].map(m => Card(parts, m, tier, width))),
    row([Slot(parts, width), pace(five), pace(week)]),
    row([Card(parts, cache, tier, width), Card(parts, hit, tier, width), Slot(parts, width, segs(Text, footer))]),
  ]
}

// Wide is the 3 x 3 grid; narrower bands flow the cards 1 or 2 to a row, the clock and session last.
export const DesktopBand = (parts: Parts, metrics: readonly Metric[], footer: readonly Seg[], tier: Tier, columns: number) => {
  const { Box, Text } = parts
  const per = cardsPerRow(tier)
  const width = cardWidth(columns, per)
  return (
    <Box flexDirection="column" paddingX={PAD}>
      {tier === 'wide'
        ? wideGrid(parts, metrics, footer, tier, width)
        : chunk(metrics, per).map(row => (
            <Box flexDirection="row" gap={GAP}>
              {row.map(m => Card(parts, m, tier, width))}
            </Box>
          ))}
      {tier === 'medium' && segs(Text, footer)}
    </Box>
  )
}
