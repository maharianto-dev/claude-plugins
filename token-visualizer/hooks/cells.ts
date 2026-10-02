import type { Cache, Usage } from '../types'
import { countdownText, hitPercent, remainingMs, remainingPercent } from './cache'
import { meterColor, YELLOW } from './color'
import { barText, elapsedText, percentText, resetText, tokenText } from './format'
import type { Cell, Seg } from './layout'
import { deltaVerdict, FIVE_HOUR_MS, paceOf, projectionColor, SEVEN_DAY_MS } from './pace'

export const BAR_WIDTH = 12
const LABEL_WIDTH = 5

const label = (name: string): Seg => ({ text: name.padEnd(LABEL_WIDTH) + ' ', dim: true })

const bar = (percent: number, color: string | undefined): Seg[] => {
  const b = barText(percent, BAR_WIDTH)
  return [{ text: b.on, color }, { text: b.off, dim: true }]
}

const meter = (name: string, percent: number, detail: string, dimDetail: boolean, color: string): Cell => [
  label(name),
  ...bar(percent, color),
  { text: ` ${detail}`, dim: dimDetail },
  { text: ` ${Math.round(percent)}%`, color },
]

const limit = (name: string, w: Usage['fiveHour'], now: number): Cell =>
  w === null
    ? [{ text: `${name.padEnd(LABEL_WIDTH)} n/a`, dim: true }]
    : meter(name, w.percent, resetText(w.resetsAt, now), true, meterColor(w.percent, 'bad'))

const rate = (percent: number): Seg[] => {
  const color = meterColor(percent, 'good')
  return [...bar(percent, color), { text: ` ${percentText(percent)}`, color }]
}

// Parts are fixed width, so the cell holds its size while the numbers tick.
const DELTA_WIDTH = 'under 100.0%'.length

const paceCell = (w: Usage['fiveHour'], windowMs: number, now: number): Cell => {
  const pace = w === null ? null : paceOf(w.percent, w.resetsAt, windowMs, now)
  if (pace === null) return [{ text: 'pace –', dim: true }]
  const v = deltaVerdict(pace.delta)
  return [
    label('pace'),
    { text: `ideal ${percentText(pace.ideal)}`, dim: true },
    { text: '  ' },
    { text: v.text.padEnd(DELTA_WIDTH), color: v.color, dim: v.dim },
    { text: '  proj ' },
    { text: percentText(pace.projected), color: projectionColor(pace.projected) },
  ]
}

const cacheCell = (c: Cache | null, now: number): Cell => {
  if (c === null || c.ttl === null) return [{ text: 'cache –', dim: true }]
  if (remainingMs(c.lastAt, c.ttl, now) === 0) return [label('cache'), ...bar(0, undefined), { text: ' cold', dim: true }]
  const percent = remainingPercent(c.lastAt, c.ttl, now)
  const color = meterColor(percent, 'good')
  return [label('cache'), ...bar(percent, color), { text: ` ${countdownText(remainingMs(c.lastAt, c.ttl, now))}`, color }]
}

const hitCell = (c: Cache | null): Cell =>
  c === null
    ? [{ text: 'hit  –', dim: true }]
    : [label('hit'), ...rate(hitPercent(c.last)), { text: '  Σ ', dim: true }, ...rate(hitPercent(c.total))]

// The band's 3 x 3 grid: context and limits, then pace under the limits, then cache, hit and session.
export const bandCells = (u: Usage, c: Cache | null, now: number, startedAt: number): Cell[][] => [
  [
    meter('ctx', u.contextPercent, `${tokenText(u.contextTokens)}/${tokenText(u.contextWindow)}`, false, meterColor(u.contextPercent, 'bad')),
    limit('5h', u.fiveHour, now),
    limit('week', u.sevenDay, now),
  ],
  [[], paceCell(u.fiveHour, FIVE_HOUR_MS, now), paceCell(u.sevenDay, SEVEN_DAY_MS, now)],
  [
    cacheCell(c, now),
    hitCell(c),
    [{ text: 'session ', dim: true }, { text: elapsedText(now - startedAt), color: YELLOW }],
  ],
]
