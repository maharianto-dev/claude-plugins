import type { CacheTtl, Counts } from '../types'

export const ZERO: Counts = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 }

export const addCounts = (a: Counts, b: Counts): Counts => ({
  input: a.input + b.input,
  output: a.output + b.output,
  cacheRead: a.cacheRead + b.cacheRead,
  cacheCreation: a.cacheCreation + b.cacheCreation,
})

// Share of the prompt the cache served; 0 when nothing was sent.
export const hitPercent = (c: Counts): number => {
  const prompt = c.input + c.cacheRead + c.cacheCreation
  return prompt === 0 ? 0 : (c.cacheRead / prompt) * 100
}

export const ttlMs = (ttl: CacheTtl): number => (ttl === '1h' ? 3_600_000 : 300_000)

export const remainingMs = (lastAt: number, ttl: CacheTtl, now: number): number =>
  Math.max(0, lastAt + ttlMs(ttl) - now)

export const remainingPercent = (lastAt: number, ttl: CacheTtl, now: number): number =>
  (remainingMs(lastAt, ttl, now) / ttlMs(ttl)) * 100

// Always mm:ss; rounds up so a full cache reads 60:00 until a whole second has passed.
export const countdownText = (ms: number): string => {
  const secs = Math.ceil(Math.max(0, ms) / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`
}
