export type Usage = {
  contextPercent: number
  contextTokens: number
  contextWindow: number
  fiveHour: { percent: number; resetsAt?: string } | null
  sevenDay: { percent: number; resetsAt?: string } | null
}

export type Counts = {
  input: number
  output: number
  cacheRead: number
  cacheCreation: number
}

export type CacheTtl = '5m' | '1h'

export type Cache = {
  // When the last main-loop request finished, in $.clock.now() milliseconds.
  lastAt: number
  // Null until a transcript shows which bucket the cache writes go to.
  ttl: CacheTtl | null
  last: Counts
  total: Counts
}

declare module 'claude-code' {
  interface PluginState {
    'token-visualizer': { 'usage-v2': Usage | null; 'cache-v1': Cache | null }
  }
}
