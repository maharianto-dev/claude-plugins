import { test, expect } from 'claude-code/testing'
import { PREVIEW_COLUMNS, PREVIEW_LINES, previewLines } from './preview'

test('the first lines are kept, cut to the preview width', () => {
  const head = Array.from({ length: 30 }, (_, i) => `line ${i}\t${'x'.repeat(100)}`).join('\n')
  const lines = previewLines(head)!
  expect(lines).toHaveLength(PREVIEW_LINES)
  expect(lines[0]!.startsWith('line 0  xxx')).toBe(true)
  expect(lines[0]).toHaveLength(PREVIEW_COLUMNS)
})

test('carriage returns are dropped', () => {
  expect(previewLines('a\r\nb')).toEqual(['a', 'b'])
})

test('a NUL byte or several replacement characters mean binary', () => {
  expect(previewLines('PK\0\0abc')).toBeNull()
  expect(previewLines('��abc')).toBeNull()
})

test('one replacement character at the cut is still text', () => {
  expect(previewLines('héllo�')).toEqual(['héllo�'])
})
