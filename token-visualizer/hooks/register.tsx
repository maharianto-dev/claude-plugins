import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Usage } from '../types'
import { colorFor } from './color'
import { barText, resetText, tokenText } from './format'

const usage = atom({ plugin: 'token-visualizer', key: 'usage-v2' } as const, null)

const BAR_WIDTH = 12
// Longer than any terminal; truncate-end cuts it at the screen edge.
const RULE = '─'.repeat(500)

export const register: Register = on => {
  on('session.measure', async ($, e, next) => {
    const pick = (kind: string) => {
      const w = e.rateLimits.find(r => r.kind === kind)
      return w ? { percent: w.percentUsed, resetsAt: w.resetsAt } : null
    }
    const next_: Usage = {
      contextPercent: e.context.percent ?? 0,
      contextTokens: e.context.tokens ?? 0,
      contextWindow: e.context.window,
      fiveHour: pick('five_hour'),
      sevenDay: pick('seven_day'),
    }
    await update($, usage, () => next_)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const u = await read($, usage)
    if (e.props.hasSurvey || u === null) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const now = await $.clock.now()

    const meter = (label: string, percent: number, detail: string, dim: boolean) => {
      const bar = barText(percent, BAR_WIDTH)
      const color = colorFor(percent)
      return (
        <Text>
          <Text dimColor>{label} </Text>
          <Text color={color}>{bar.on}</Text>
          <Text dimColor>{bar.off}</Text>
          <Text dimColor={dim}> {detail}</Text>
          <Text color={color}> {Math.round(percent)}%</Text>
        </Text>
      )
    }
    const limit = (label: string, w: Usage['fiveHour']) =>
      w === null
        ? <Text dimColor>{label} n/a</Text>
        : meter(label, w.percent, resetText(w.resetsAt, now), true)

    const divider = <Text dimColor>│</Text>

    return (
      <Box flexDirection="column">
        <Text dimColor wrap="truncate-end">{RULE}</Text>
        <Box flexDirection="row" gap={2}>
          {meter('ctx ', u.contextPercent, `${tokenText(u.contextTokens)}/${tokenText(u.contextWindow)}`, false)}
          {divider}
          {limit('5h  ', u.fiveHour)}
          {divider}
          {limit('week', u.sevenDay)}
        </Box>
      </Box>
    )
  })
}
