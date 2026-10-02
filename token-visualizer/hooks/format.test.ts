import { test, expect } from 'claude-code/testing'
import { barText, elapsedText, percentText, tokenText } from './format'

test('bar fills proportionally', () => {
  expect(barText(50, 10)).toEqual({ on: '█████', off: '░░░░░' })
})

test('token counts are abbreviated', () => {
  expect(tokenText(850)).toBe('850')
  expect(tokenText(42_300)).toBe('42k')
  expect(tokenText(1_000_000)).toBe('1M')
})

test('elapsed time hides leading zero units and pads the rest', () => {
  expect(elapsedText(0)).toBe('00s')
  expect(elapsedText(5_000)).toBe('05s')
  expect(elapsedText(192_000)).toBe('03m12s')
  expect(elapsedText(3_605_000)).toBe('01h00m05s')
  expect(elapsedText(7_200_999)).toBe('02h00m00s')
  expect(elapsedText(((4 * 24 + 4) * 3600 + 30 * 60 + 5) * 1000)).toBe('4d04h30m05s')
  expect(elapsedText(12 * 86_400_000)).toBe('12d00h00m00s')
})

test('percent has one decimal and is padded to 6 characters', () => {
  expect(percentText(0)).toBe('  0.0%')
  expect(percentText(92.44)).toBe(' 92.4%')
  expect(percentText(88.06)).toBe(' 88.1%')
  expect(percentText(100)).toBe('100.0%')
})
