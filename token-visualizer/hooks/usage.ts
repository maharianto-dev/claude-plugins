import type { SessionUsage } from 'claude-code'

import type { Usage } from '../types'

export const usageFrom = (s: Pick<SessionUsage, 'context' | 'rateLimits'>): Usage => {
  const pick = (kind: string) => {
    const w = s.rateLimits.find(r => r.kind === kind)
    return w ? { percent: w.percentUsed, resetsAt: w.resetsAt } : null
  }
  return {
    contextPercent: s.context.percent ?? 0,
    contextTokens: s.context.tokens ?? 0,
    contextWindow: s.context.window,
    fiveHour: pick('five_hour'),
    sevenDay: pick('seven_day'),
  }
}
