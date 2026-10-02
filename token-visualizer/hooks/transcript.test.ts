import { test, expect } from 'claude-code/testing'
import { tailArgv, ttlFromTranscript } from './transcript'

const entry = (made: { h?: number; m?: number } | null, extra: object = {}) =>
  JSON.stringify({
    type: 'assistant',
    message: { usage: made === null ? {} : { cache_creation: { ephemeral_1h_input_tokens: made.h ?? 0, ephemeral_5m_input_tokens: made.m ?? 0 } } },
    ...extra,
  })

test('the newest cache write names the ttl', () => {
  expect(ttlFromTranscript([entry({ m: 5 }), entry({ h: 5 })].join('\n'))).toBe('1h')
  expect(ttlFromTranscript([entry({ h: 5 }), entry({ m: 5 })].join('\n'))).toBe('5m')
})

test('pure cache hits are skipped', () => {
  expect(ttlFromTranscript([entry({ h: 5 }), entry({ h: 0, m: 0 })].join('\n'))).toBe('1h')
})

test('subagent and non-assistant entries are ignored', () => {
  const text = [entry({ h: 5 }), entry({ m: 5 }, { isSidechain: true }), JSON.stringify({ type: 'user' }), ''].join('\n')
  expect(ttlFromTranscript(text)).toBe('1h')
})

test('no breakdown gives null', () => {
  expect(ttlFromTranscript([entry(null), JSON.stringify({ type: 'user' })].join('\n'))).toBeNull()
  expect(ttlFromTranscript('')).toBeNull()
})

test('unparseable lines throw', () => {
  expect(() => ttlFromTranscript('{broken')).toThrow()
})

test('only the end of the file is read', () => {
  expect(tailArgv('/t.jsonl')).toEqual(['tail', '-n', '20', '/t.jsonl'])
})
