import { test, expect } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'
import type { Item } from '../types'

const ITEMS: Item[] = [
  { label: '[Image #1]', caption: '[Image #1]', color: '#4fc76b', source: '/c/1.png', width: 100, height: 50 },
  { label: '[Pasted text #2]', caption: '[Pasted text #2]', color: '#a77bf3' },
]

// The engine beneath the plugin: its state holds the items to draw, and its own band says "below".
const stateHolds = (on: On, held: Item[]) => {
  on('state.get', () => ({ value: { value: held, version: 1 } }))
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['below'] }))
}

const mount = ($: Engine, hasSurvey = false) =>
  $.ui.mount({
    plugin: 'paste-peek',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: {
      hasSurvey,
      isWorking: false,
      maxRows: 12,
      bodyColumns: 100,
      scroll: { bodyRows: 12, offset: 0 },
      view: {},
    },
  })

test('with nothing pasted the band is the engine\'s own', async ($, on) => {
  stateHolds(on, [])
  const ui = await mount($)
  expect(await ui.find({ type: 'Image' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: 'below' })).toBeDefined()
  await ui.unmount()
})

test('each item is a tile: the picture, and a label for text', async ($, on) => {
  stateHolds(on, ITEMS)
  const ui = await mount($)
  expect(await ui.find({ type: 'Image' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '[Pasted text #2]' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '[Image #1]' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'below' })).toBeDefined()
  await ui.unmount()
})

test('a survey keeps the band to itself', async ($, on) => {
  stateHolds(on, ITEMS)
  const ui = await mount($, true)
  expect(await ui.find({ type: 'Image' })).toBeUndefined()
  await ui.unmount()
})
