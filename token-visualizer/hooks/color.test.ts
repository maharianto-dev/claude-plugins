import { test, expect } from 'claude-code/testing'
import { meterColor } from './color'

const BLUE = '#4f9cff'
const YELLOW = '#f5c542'
const RED = '#ef4f4f'

test('bad meters run blue to red, as colorFor did', () => {
  const colors = [0, 30, 31, 70, 71, 100].map(p => meterColor(p, 'bad'))
  expect(colors).toEqual([BLUE, BLUE, YELLOW, YELLOW, RED, RED])
  expect(meterColor(30.1, 'bad')).toBe(YELLOW)
  expect(meterColor(70.1, 'bad')).toBe(RED)
})

test('good meters mirror the bad ones', () => {
  const colors = [0, 30, 31, 70, 71, 100].map(p => meterColor(p, 'good'))
  expect(colors).toEqual([RED, RED, YELLOW, YELLOW, BLUE, BLUE])
})
