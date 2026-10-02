export type Usage = {
  contextPercent: number
  contextTokens: number
  contextWindow: number
  fiveHour: { percent: number; resetsAt?: string } | null
  sevenDay: { percent: number; resetsAt?: string } | null
}

declare module 'claude-code' {
  interface PluginState {
    'token-visualizer': { 'usage-v2': Usage | null }
  }
}
