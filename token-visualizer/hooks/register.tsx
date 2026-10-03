import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Cache } from '../types'
import { Band } from './band'
import { addCounts, ZERO } from './cache'
import { bandCells } from './cells'
import { tailArgv, ttlFromTranscript } from './transcript'
import { usageFrom } from './usage'

const cache = atom({ plugin: 'token-visualizer', key: 'cache-v1' } as const, null)

const TRANSCRIPT_LAG_MS = 1500

export const register: Register = on => {
  // Redraw the band each second so the session clock and the cache countdown tick.
  on('session.start', async ($, e, next) => {
    $.clock.every(1000, () => $.ui.invalidate('ui.render'))
    return next(e)
  })

  // Each main-loop request refreshes the cache: it restarts the TTL and adds to the hit-rate sums.
  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    if (e.agentId !== undefined || result.usage === null) return result
    const now = await $.clock.now()
    const last = {
      input: result.usage.input_tokens,
      output: result.usage.output_tokens,
      cacheRead: result.usage.cache_read_input_tokens,
      cacheCreation: result.usage.cache_creation_input_tokens,
    }
    await update($, cache, (c): Cache => ({
      lastAt: now,
      ttl: c?.ttl ?? null,
      last,
      total: addCounts(c?.total ?? ZERO, last),
    }))
    return result
  })

  // The TTL is only in the transcript's cache_creation breakdown; a pure cache hit leaves it as it was.
  // The transcript lags the end of the turn, so until the first TTL is known the hook waits for the write.
  on('classic.Stop', async ($, e, next) => {
    if ((await read($, cache))?.ttl === null) await $.clock.sleep(TRANSCRIPT_LAG_MS, { signal: next.signal })
    const ran = await $.process.run(tailArgv(e.transcript_path))
    if (ran.exitCode !== 0) throw new Error(`tail exited ${ran.exitCode}: ${ran.stderr.trim()}`)
    const ttl = ttlFromTranscript(ran.stdout)
    if (ttl !== null) await update($, cache, c => (c === null ? c : { ...c, ttl }))
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const now = await $.clock.now()
    const session = await $.session.usage()
    const parts = $.ui.resolve(e)
    const { Box } = parts
    const band = Band(parts, bandCells(usageFrom(session), await read($, cache), now, session.startedAt))
    // Drawn below whatever runs after it in the band, so a band above it (paste-peek's tiles) stays visible.
    return (
      <Box flexDirection="column">
        {await next(e)}
        {band}
      </Box>
    )
  })
}
