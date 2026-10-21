import type { Cache, Usage } from '../types'
import { countdownText, hitPercent, remainingMs, remainingPercent } from './cache'
import { meterColor, YELLOW } from './color'
import { clockText, elapsedText, resetText, tokenText } from './format'
import type { Seg } from './layout'
import { deltaVerdict, FIVE_HOUR_MS, paceOf, projectionColor, SEVEN_DAY_MS } from './pace'

// One meter of the desktop band: a card with a bar, its value, and optional lines under it.
export type Metric = {
  label: string
  // Null draws an empty bar and `value` alone.
  percent: number | null
  color?: string
  value: string
  detail?: string
  pace?: Seg[]
}

const pct = (p: number): string => `${p.toFixed(1)}%`

const paceLine = (w: NonNullable<Usage['fiveHour']>, windowMs: number, now: number): Seg[] | undefined => {
  const pace = paceOf(w.percent, w.resetsAt, windowMs, now)
  if (pace === null) return undefined
  const v = deltaVerdict(pace.delta)
  return [
    { text: `ideal ${pct(pace.ideal)} · `, dim: true },
    { text: v.text, color: v.color, dim: v.dim },
    { text: ' · proj ', dim: true },
    { text: pct(pace.projected), color: projectionColor(pace.projected) },
  ]
}

const limit = (label: string, w: Usage['fiveHour'], windowMs: number, now: number): Metric =>
  w === null
    ? { label, percent: null, value: 'n/a' }
    : {
        label,
        percent: w.percent,
        color: meterColor(w.percent, 'bad'),
        value: pct(w.percent),
        detail: resetText(w.resetsAt, now),
        pace: paceLine(w, windowMs, now),
      }

const cacheMetric = (c: Cache | null, now: number): Metric => {
  if (c === null || c.ttl === null) return { label: 'cache', percent: null, value: '–' }
  if (remainingMs(c.lastAt, c.ttl, now) === 0) return { label: 'cache', percent: 0, value: 'cold', detail: `${c.ttl} TTL` }
  const percent = remainingPercent(c.lastAt, c.ttl, now)
  return {
    label: 'cache',
    percent,
    color: meterColor(percent, 'good'),
    value: countdownText(remainingMs(c.lastAt, c.ttl, now)),
    detail: `${c.ttl} TTL`,
  }
}

const hitMetric = (c: Cache | null): Metric => {
  if (c === null) return { label: 'hit', percent: null, value: '–' }
  const last = hitPercent(c.last)
  return { label: 'hit', percent: last, color: meterColor(last, 'good'), value: pct(last), detail: `Σ ${pct(hitPercent(c.total))}` }
}

export const desktopMetrics = (u: Usage, c: Cache | null, now: number): Metric[] => [
  {
    label: 'ctx',
    percent: u.contextPercent,
    color: meterColor(u.contextPercent, 'bad'),
    value: pct(u.contextPercent),
    detail: `${tokenText(u.contextTokens)} / ${tokenText(u.contextWindow)}`,
  },
  limit('5h', u.fiveHour, FIVE_HOUR_MS, now),
  limit('week', u.sevenDay, SEVEN_DAY_MS, now),
  cacheMetric(c, now),
  hitMetric(c),
]

export const footerSegs = (now: number, startedAt: number): Seg[] => [
  { text: clockText(now), dim: true },
  { text: '  session ', dim: true },
  { text: elapsedText(now - startedAt), color: YELLOW },
]
