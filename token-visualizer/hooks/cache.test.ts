import { test, expect } from 'claude-code/testing'
import { addCounts, countdownText, hitPercent, remainingMs, remainingPercent, ttlMs, ZERO } from './cache'

test('countdown is mm:ss with two-digit fields', () => {
  expect(countdownText(0)).toBe('00:00')
  expect(countdownText(272_000)).toBe('04:32')
  expect(countdownText(2_712_000)).toBe('45:12')
  expect(countdownText(3_600_000)).toBe('60:00')
  expect(countdownText(3_599_001)).toBe('60:00')
})

test('hit rate is cache reads over the whole prompt', () => {
  expect(hitPercent({ input: 2, output: 99, cacheRead: 90, cacheCreation: 8 })).toBe(90)
  expect(hitPercent(ZERO)).toBe(0)
})

test('counts add field by field', () => {
  const sum = addCounts({ input: 1, output: 2, cacheRead: 3, cacheCreation: 4 }, { input: 10, output: 20, cacheRead: 30, cacheCreation: 40 })
  expect(sum).toEqual({ input: 11, output: 22, cacheRead: 33, cacheCreation: 44 })
})

test('remaining time drains from the ttl to zero and stays there', () => {
  expect(ttlMs('1h')).toBe(3_600_000)
  expect(ttlMs('5m')).toBe(300_000)
  expect(remainingMs(1000, '5m', 1000)).toBe(300_000)
  expect(remainingPercent(1000, '1h', 1000)).toBe(100)
  expect(remainingPercent(0, '5m', 150_000)).toBe(50)
  expect(remainingMs(0, '5m', 400_000)).toBe(0)
})
