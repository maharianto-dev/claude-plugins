export const barText = (percent: number, width: number): { on: string; off: string } => {
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * width)
  return { on: '█'.repeat(filled), off: '░'.repeat(width - filled) }
}

export const resetText = (resetsAt: string | undefined, now: number): string => {
  if (!resetsAt) return 'reset –'
  const ms = Date.parse(resetsAt) - now
  if (ms <= 0) return 'reset now'
  const mins = Math.ceil(ms / 60000)
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  const left = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
  const at = new Date(resetsAt)
  const clock = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
  return `resets ${d > 0 ? at.toLocaleDateString(undefined, { weekday: 'short' }) + ' ' : ''}${clock} (in ${left})`
}

export const tokenText = (n: number): string =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)
