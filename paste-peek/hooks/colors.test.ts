import { test, expect } from 'claude-code/testing'
import { PALETTE, pickColor } from './colors'

test('the palette is green, blue, orange, yellow, red and purple', () => {
  expect(PALETTE).toHaveLength(6)
  expect(new Set(PALETTE).size).toBe(6)
})

test('a random number in [0, 1) picks a palette color, end to end', () => {
  expect(pickColor(0)).toBe(PALETTE[0])
  expect(pickColor(0.5)).toBe(PALETTE[3])
  expect(pickColor(0.999999)).toBe(PALETTE[5])
})
