import { test, expect } from 'claude-code/testing'
import { GREEN, RED } from './color'
import { deltaVerdict, FIVE_HOUR_MS, paceOf, projectionColor, SEVEN_DAY_MS } from './pace'

const HOUR = 3_600_000
const NOW = Date.parse('2026-10-03T12:00:00Z')
const round = (n: number) => Math.round(n * 1e6) / 1e6
const resetIn = (ms: number) => new Date(NOW + ms).toISOString()

test('ideal is the share of the window that has elapsed', () => {
  expect(round(paceOf(0, resetIn(4 * HOUR), FIVE_HOUR_MS, NOW)!.ideal)).toBe(20)
  expect(round(paceOf(0, resetIn(3.5 * 24 * HOUR), SEVEN_DAY_MS, NOW)!.ideal)).toBe(50)
})

test('24% used one hour into five is over pace by 4% and projects 120%', () => {
  const p = paceOf(24, resetIn(4 * HOUR), FIVE_HOUR_MS, NOW)!
  expect(round(p.delta)).toBe(4)
  expect(round(p.projected)).toBe(120)
  expect(deltaVerdict(p.delta).text).toBe('over 4.0%')
})

test('a missing reset, a reset in the past and zero elapsed have no pace', () => {
  expect(paceOf(10, undefined, FIVE_HOUR_MS, NOW)).toBeNull()
  expect(paceOf(10, resetIn(-1000), FIVE_HOUR_MS, NOW)).toBeNull()
  expect(paceOf(10, resetIn(0), FIVE_HOUR_MS, NOW)).toBeNull()
  expect(paceOf(10, resetIn(FIVE_HOUR_MS), FIVE_HOUR_MS, NOW)).toBeNull()
})

test('over, under and on pace', () => {
  expect(deltaVerdict(3.5)).toEqual({ text: 'over 3.5%', color: RED })
  expect(deltaVerdict(-12)).toEqual({ text: 'under 12.0%', color: GREEN })
  expect(deltaVerdict(0.05).text).toBe('over 0.1%')
  expect(deltaVerdict(0.049)).toEqual({ text: 'on pace', dim: true })
  expect(deltaVerdict(-0.049).text).toBe('on pace')
  expect(deltaVerdict(-0.05).text).toBe('under 0.1%')
})

test('projection is green up to 100.0% and red above', () => {
  expect(projectionColor(100)).toBe(GREEN)
  expect(projectionColor(100.04)).toBe(GREEN)
  expect(projectionColor(100.1)).toBe(RED)
  expect(projectionColor(82)).toBe(GREEN)
})
