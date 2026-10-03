import type { ModelCompleteResult } from 'claude-code'

import { isSealed } from './seal'

export type Verdict = { improve: false } | { improve: true; request: string }

const NAMES = new Set(['wordsmith', 'ws'])
const WORD = /[\p{L}\p{N}]+/gu

/** The prompt's words, lowercased, punctuation and symbols dropped (`name:` reads as `name`). */
export const tokensOf = (text: string): string[] => (text.toLowerCase().match(WORD) ?? [])

/**
 * Whether the prompt names wordsmith, and its text with every other name for it spelled `wordsmith`.
 * `seal` is the digest a third name must match.
 */
export async function findTrigger(text: string, seal: string): Promise<{ isNamed: boolean; text: string }> {
  const sealed = new Set<string>()
  for (const token of new Set(tokensOf(text))) {
    if (!NAMES.has(token) && (await isSealed(token, seal))) sealed.add(token)
  }
  const isNamed = sealed.size > 0 || tokensOf(text).some(t => NAMES.has(t))
  if (sealed.size === 0) return { isNamed, text }
  return { isNamed, text: text.replace(WORD, w => (sealed.has(w.toLowerCase()) ? 'wordsmith' : w)) }
}

export function classifyPrompt(text: string): string {
  return [
    'Wordsmith is a tool that turns a rough request into a well-structured prompt for an AI assistant.',
    'Its names are "wordsmith" and "ws". A user typed the message below to an AI coding assistant.',
    'Decide whether the message asks Wordsmith to write, improve, rework or polish a prompt.',
    'A message where "ws" or "wordsmith" means something else is not such a request: "fix the ws reconnect bug",',
    '"the ws server drops frames", "rename the wordsmith class".',
    'When it is unclear, it is not a request.',
    'For a request, give the rough request the user wants turned into a prompt, as they wrote it,',
    'without the part that addresses Wordsmith ("ws improve this:", "wordsmith, write a prompt for").',
    'Answer with JSON only, no prose and no code fence: {"improve": true, "request": "<request>"} or {"improve": false}.',
    '',
    '<message>',
    text,
    '</message>',
  ].join('\n')
}

/** The model call that classifies the prompt: a small model, little effort, a short answer. */
export const classifyAsk = (text: string) => ({
  model: 'haiku',
  prompt: classifyPrompt(text),
  effort: 'low',
  maxTokens: 1000,
  timeoutMs: 20_000,
}) as const

export const stripFence = (text: string) => text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')

export function parseVerdict(text: string): Verdict {
  const answer: unknown = JSON.parse(stripFence(text))
  if (typeof answer !== 'object' || answer === null || !('improve' in answer) || typeof answer.improve !== 'boolean') {
    throw new Error(`classifier answer is not {"improve": boolean}: ${text}`)
  }
  if (!answer.improve) return { improve: false }
  if (!('request' in answer) || typeof answer.request !== 'string' || answer.request.trim() === '') {
    throw new Error(`classifier answer has no request: ${text}`)
  }
  return { improve: true, request: answer.request.trim() }
}

export function verdictOf(reply: ModelCompleteResult): Verdict {
  if (!reply.isAnswered) throw new Error(`classifier call failed: ${reply.reason}`)
  return parseVerdict(reply.text)
}
