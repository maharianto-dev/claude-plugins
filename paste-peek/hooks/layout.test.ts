import { test, expect } from 'claude-code/testing'
import type { FilePaste, Item } from '../types'
import { buildItems } from './items'
const RED = '#ef4f4f'
import { CHROME_ROWS, fitTiles, MAX_CONTENT_ROWS } from './layout'

const picture = (n: number, width = 1000, height = 500): Item =>
  ({ label: `[Image #${n}]`, caption: `[Image #${n}]`, color: RED, source: `/c/${n}.png`, width, height })

test('tiles take the tallest content height the budget allows', () => {
  const [p] = fitTiles([picture(1)], 100, 200)
  expect(p!.rows).toBe(MAX_CONTENT_ROWS)
  expect(p!.columns).toBe(32)
  expect(fitTiles([picture(1)], 7, 200)[0]!.rows).toBe(7 - CHROME_ROWS)
})

test('all tiles shrink together until the row fits', () => {
  const items = [picture(1), picture(2), picture(3)]
  const placed = fitTiles(items, 100, 50)
  const width = placed.reduce((s, p) => s + p.width, 0) + 2
  expect(width).toBeLessThanOrEqual(50)
  expect(new Set(placed.map(p => p.rows)).size).toBe(1)
  expect(placed[0]!.rows).toBeLessThan(MAX_CONTENT_ROWS)
})

test('with no room at all the tiles stay one row tall', () => {
  expect(fitTiles([picture(1), picture(2)], 2, 5).map(p => p.rows)).toEqual([1, 1])
})

test('items without a picture or a preview are label tiles as wide as their label', () => {
  const [p] = fitTiles([{ label: '[Pasted text #1]', caption: '[Pasted text #1]', color: RED }], 10, 80)
  expect(p).toMatchObject({ kind: 'label', columns: 16, rows: 1, width: 18 })
})

test('a preview is as tall as its lines, up to the content height', () => {
  const [p] = fitTiles([{ label: 'a.txt', caption: 'a.txt', color: RED, lines: ['one', 'two'] }], 100, 80)
  expect(p).toMatchObject({ kind: 'lines', columns: 3, rows: 2, width: 7 })
})

test('items follow the draft: tags and file paths in the order they appear', () => {
  const file: FilePaste = { needle: '/home/u/notes.md', path: '/home/u/notes.md', lines: ['# hi'] }
  const images = new Map([[1, { path: '/c/1.png', width: 10, height: 10 }]])
  const draft = 'a /home/u/notes.md b [Image #1] c [Pasted text #2 +9 lines] d [Image #3]'
  const items = buildItems(draft, [file], images, () => RED)
  expect(items.map(i => i.label)).toEqual(['notes.md', '[Image #1]', '[Pasted text #2]', '[Image #3]'])
  expect(items[0]!.lines).toEqual(['# hi'])
  expect(items[1]!.source).toBe('/c/1.png')
  expect(items[3]!.source).toBeUndefined()
})

test('a file whose path left the draft is dropped', () => {
  const file: FilePaste = { needle: '/x/a.md', path: '/x/a.md', lines: null }
  expect(buildItems('nothing here', [file], new Map(), () => RED)).toEqual([])
  expect(buildItems('/x/a.md', [file], new Map(), () => RED)[0]).toEqual({ label: 'a.md', caption: 'a.md', color: RED })
})

test('each item asks for its color by key, and keeps the one it gets', () => {
  const asked: string[] = []
  const colorOf = (key: string) => (asked.push(key), key.startsWith('[Image') ? '#4fc76b' : '#a77bf3')
  const items = buildItems('[Image #1] [Pasted text #2 +9 lines]', [], new Map(), colorOf)
  expect(asked).toEqual(['[Image #1]', '[Pasted text #2]'])
  expect(items.map(i => i.color)).toEqual(['#4fc76b', '#a77bf3'])
})
