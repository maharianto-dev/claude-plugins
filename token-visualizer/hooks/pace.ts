import { GREEN, RED } from './color'

export const FIVE_HOUR_MS = 5 * 3_600_000
export const SEVEN_DAY_MS = 7 * 86_400_000

export type Pace = {
  ideal: number
  delta: number
  projected: number
}

const clamp = (p: number): number => Math.min(100, Math.max(0, p))

// Null when there is nothing to compare: no reset time, a window already over, or no time elapsed.
export const paceOf = (used: number, resetsAt: string | undefined, windowMs: number, now: number): Pace | null => {
  if (!resetsAt) return null
  const end = Date.parse(resetsAt)
  const elapsed = now - (end - windowMs)
  if (end <= now || elapsed <= 0) return null
  const ideal = clamp((elapsed / windowMs) * 100)
  return { ideal, delta: used - ideal, projected: (used / elapsed) * windowMs }
}

export type Verdict = { text: string; color?: string; dim?: boolean }

const ON_PACE = 0.05

export const deltaVerdict = (delta: number): Verdict =>
  Math.abs(delta) < ON_PACE
    ? { text: 'on pace', dim: true }
    : delta > 0
      ? { text: `over ${delta.toFixed(1)}%`, color: RED }
      : { text: `under ${(-delta).toFixed(1)}%`, color: GREEN }

// Compared at the displayed precision, so 100.04% (shown 100.0%) still counts as on budget.
export const projectionColor = (projected: number): string =>
  Math.round(projected * 10) / 10 > 100 ? RED : GREEN
