export type Token = { kind: 'image' | 'text'; n: number; at: number }

// Claude's draft tags: "[Image #2]" and "[Pasted text #1 +42 lines]".
const TAG = /\[(Image|Pasted text) #(\d+)[^\]]*\]/g

// The tags in draft order, one per kind and number.
export const parseTokens = (draft: string): Token[] => {
  const seen = new Set<string>()
  const tokens: Token[] = []
  for (const m of draft.matchAll(TAG)) {
    const kind = m[1] === 'Image' ? 'image' : 'text'
    const n = Number(m[2])
    if (seen.has(`${kind}${n}`)) continue
    seen.add(`${kind}${n}`)
    tokens.push({ kind, n, at: m.index })
  }
  return tokens
}
