import { test, expect } from 'claude-code/testing'
import type { Cache, Usage } from '../types'
import { bandCells } from './cells'
import { cellWidth, columnWidths } from './layout'

test('a cell is as wide as its text', () => {
  expect(cellWidth([{ text: 'ab' }, { text: 'cde', dim: true }])).toBe(5)
  expect(cellWidth([])).toBe(0)
})

test('each column takes the widest cell, across both rows', () => {
  const rows = [
    [[{ text: 'aaaa' }], [{ text: 'b' }]],
    [[{ text: 'cc' }], [{ text: 'dddddd' }]],
  ]
  expect(columnWidths(rows)).toEqual([4, 6])
})

const usage = (five: number, week: number): Usage => ({
  contextPercent: 40,
  contextTokens: 80_000,
  contextWindow: 200_000,
  fiveHour: { percent: five, resetsAt: '2026-10-03T17:00:00Z' },
  sevenDay: { percent: week, resetsAt: '2026-10-06T09:00:00Z' },
})

const counts = (read: number) => ({ input: 100, output: 50, cacheRead: read, cacheCreation: 10 })

test('pace and hit cells keep their width as the numbers change', () => {
  const now = Date.parse('2026-10-03T13:00:00Z')
  const widthsFor = (five: number, week: number, hit: number) => {
    const c: Cache = { lastAt: now - 1000, ttl: '5m', last: counts(hit), total: counts(hit) }
    const rows = bandCells(usage(five, week), c, now, now - 3_725_000)
    expect(rows).toHaveLength(3)
    rows.forEach(row => expect(row).toHaveLength(3))
    return [cellWidth(rows[1]![1]!), cellWidth(rows[1]![2]!), cellWidth(rows[2]![1]!)]
  }
  const widths = widthsFor(24, 41, 5000)
  expect(widthsFor(100, 7, 0)).toEqual(widths)
  expect(widthsFor(3.5, 99.9, 100_000)).toEqual(widths)
})

test('the pace row is empty under ctx and every row has a pace or placeholder per limit', () => {
  const now = Date.parse('2026-10-03T13:00:00Z')
  const rows = bandCells(usage(24, 41), null, now, now)
  expect(rows[1]![0]).toEqual([])
  expect(rows[1]![1]!.map(s => s.text).join('')).toMatch(/^pace  ideal  20\.0%  over 4\.0% {5}proj 120\.0%$/)
  const none = bandCells({ ...usage(0, 0), fiveHour: null }, null, now, now)
  expect(none[1]![1]).toEqual([{ text: 'pace –', dim: true }])
})
