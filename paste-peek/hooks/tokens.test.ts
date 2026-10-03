import { test, expect } from 'claude-code/testing'
import { parseTokens } from './tokens'

test('tags come back in draft order with their positions', () => {
  const draft = 'see [Image #2] and [Pasted text #1 +42 lines] then [Image #1]'
  expect(parseTokens(draft)).toEqual([
    { kind: 'image', n: 2, at: 4 },
    { kind: 'text', n: 1, at: 19 },
    { kind: 'image', n: 1, at: 51 },
  ])
})

test('a tag repeated in the draft counts once', () => {
  expect(parseTokens('[Image #1] [Image #1]')).toHaveLength(1)
})

test('text that only looks like a tag is ignored', () => {
  expect(parseTokens('Image #1 [Image] [Pasted #3] [Image #x]')).toEqual([])
})
