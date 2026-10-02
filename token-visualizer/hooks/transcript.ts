import type { CacheTtl } from '../types'

// Claude Code's transcript is internal: recheck this when its entry format changes.
// Only the end of the file is read: $.fs.read rejects files over 4 MiB, which long sessions pass.
export const TAIL_LINES = 20

export const tailArgv = (path: string): string[] => ['tail', '-n', String(TAIL_LINES), path]

type Entry = {
  type?: string
  isSidechain?: boolean
  message?: {
    usage?: {
      cache_creation?: { ephemeral_1h_input_tokens?: number; ephemeral_5m_input_tokens?: number }
    }
  }
}

// The TTL bucket of the newest main-loop request that wrote to the cache; null when none did.
// Entries that only read the cache (both buckets empty) and subagent entries are skipped.
export function ttlFromTranscript(text: string): CacheTtl | null {
  const lines = text.split('\n').filter(l => l.trim() !== '')
  for (let i = lines.length - 1; i >= 0; i--) {
    const entry: Entry = JSON.parse(lines[i]!)
    if (entry.type !== 'assistant' || entry.isSidechain === true) continue
    const made = entry.message?.usage?.cache_creation
    if (made === undefined) continue
    if ((made.ephemeral_1h_input_tokens ?? 0) > 0) return '1h'
    if ((made.ephemeral_5m_input_tokens ?? 0) > 0) return '5m'
  }
  return null
}
