import type { Cache, Usage } from '../types'
import { countdownText, hitPercent, remainingMs, remainingPercent } from './cache'
import { meterColor, YELLOW } from './color'
import { barText, elapsedText, resetText, tokenText } from './format'
import type { Cell, Seg } from './layout'

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
  return [...bar(percent, color), { text: ` ${Math.round(percent)}%`, color }]
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

// The band's 3 x 2 grid: context and limits on top, cache and session below.
export const bandCells = (u: Usage, c: Cache | null, now: number, startedAt: number): Cell[][] => [
  [
    meter('ctx', u.contextPercent, `${tokenText(u.contextTokens)}/${tokenText(u.contextWindow)}`, false, meterColor(u.contextPercent, 'bad')),
    limit('5h', u.fiveHour, now),
    limit('week', u.sevenDay, now),
  ],
  [
    cacheCell(c, now),
    hitCell(c),
    [{ text: 'session ', dim: true }, { text: elapsedText(now - startedAt), color: YELLOW }],
  ],
]
