import { test, expect } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { cardsPerRow, tierOf } from './tier'

test('the band width picks narrow, medium or wide', () => {
  expect(tierOf(40)).toBe('narrow')
  expect(tierOf(63)).toBe('narrow')
  expect(tierOf(64)).toBe('medium')
  expect(tierOf(103)).toBe('medium')
  expect(tierOf(104)).toBe('wide')
})

test('cards per row grow with the tier', () => {
  expect(['narrow', 'medium', 'wide'].map(t => cardsPerRow(t as 'narrow'))).toEqual([1, 2, 3])
})

const mount = ($: Engine, columns: number) =>
  $.ui.mount({
    plugin: 'token-visualizer',
    surface: 'desktop',
    component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: columns, scroll: { bodyRows: 20, offset: 0 }, view: {} },
  })

const NOW = Date.parse('2026-10-03T13:00:00Z')

test('the desktop band shows more of each meter as it widens', async ($, on) => {
  on('clock.now', () => ({ value: NOW }))
  on('state.get', () => ({ value: { value: null, version: 1 } }))
  on('session.usage', () => ({
    value: {
      startedAt: NOW - 60_000,
      context: { percent: 40, tokens: 80_000, window: 200_000 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 24, resetsAt: '2026-10-03T17:00:00Z' }],
    },
  }))
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['below'] }))
  const seen: Record<number, [boolean, boolean]> = {}
  for (const columns of [40, 80, 120]) {
    const ui = await mount($, columns)
    seen[columns] = [
      (await ui.find({ type: 'Text', text: /resets|n\/a/ })) !== undefined,
      (await ui.find({ type: 'Text', text: /session/ })) !== undefined,
    ]
    await ui.unmount()
  }
  expect(seen[40]![1]).toBe(false)
  expect(seen[80]![1]).toBe(true)
  expect(seen[120]![1]).toBe(true)
})
