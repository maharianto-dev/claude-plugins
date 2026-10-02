import { test, expect } from 'claude-code/testing'
import { usageFrom } from './usage'

test('usage picks the five-hour and seven-day windows', () => {
  const u = usageFrom({
    context: { window: 200_000, tokens: 80_000, percent: 40 },
    rateLimits: [
      { kind: 'spend_limit', percentUsed: 9 },
      { kind: 'seven_day', percentUsed: 41, resetsAt: '2026-10-05T09:00:00Z' },
      { kind: 'five_hour', percentUsed: 24, resetsAt: '2026-10-03T14:00:00Z' },
    ],
  })
  expect(u).toEqual({
    contextPercent: 40,
    contextTokens: 80_000,
    contextWindow: 200_000,
    fiveHour: { percent: 24, resetsAt: '2026-10-03T14:00:00Z' },
    sevenDay: { percent: 41, resetsAt: '2026-10-05T09:00:00Z' },
  })
})

test('a fresh session reads as empty context and no limits', () => {
  const u = usageFrom({ context: { window: 200_000 }, rateLimits: [] })
  expect(u.contextPercent).toBe(0)
  expect(u.contextTokens).toBe(0)
  expect(u.fiveHour).toBeNull()
  expect(u.sevenDay).toBeNull()
})
