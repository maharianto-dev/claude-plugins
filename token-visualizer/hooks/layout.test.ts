import { test, expect } from 'claude-code/testing'
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
