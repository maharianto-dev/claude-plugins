import { test, expect } from 'claude-code/testing'
import { colorFor } from './color'
import { barText, tokenText } from './format'

test('thresholds', () => {
  expect(colorFor(30)).toBe('#4f9cff')
  expect(colorFor(30.1)).toBe('#f5c542')
  expect(colorFor(70)).toBe('#f5c542')
  expect(colorFor(70.1)).toBe('#ef4f4f')
})

test('bar fills proportionally', () => {
  expect(barText(50, 10)).toEqual({ on: '█████', off: '░░░░░' })
})

test('token counts are abbreviated', () => {
  expect(tokenText(850)).toBe('850')
  expect(tokenText(42_300)).toBe('42k')
  expect(tokenText(1_000_000)).toBe('1M')
})
