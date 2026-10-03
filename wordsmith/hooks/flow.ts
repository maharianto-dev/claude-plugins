import type { Draft, Question } from './draft'
import { wordCount } from './draft'
import { MAX_WORDS, NO_QUESTIONS_NOTE, questionsLeft, shortenNote } from './rules'

export type Answer = { question: string; answer: string }

/** One interview: the request, what was learned, and how many drafts it took. */
export type Flow = {
  request: string
  facts: string[]
  answers: Answer[]
  rounds: number
  /** Why the next draft is asked for again, when it is (a prompt that ran long). */
  note: string | null
}

export type Step =
  | { kind: 'explore'; needs: string[] }
  | { kind: 'ask'; questions: Question[] }
  | { kind: 'redraft'; note: string }
  | { kind: 'deliver'; text: string }
  | { kind: 'fail'; reason: string }

export const MAX_ROUNDS = 6

export const startFlow = (request: string): Flow => ({ request, facts: [], answers: [], rounds: 0, note: null })

/** Counts a draft and clears the note it answered. */
export const drafted = (flow: Flow): Flow => ({ ...flow, rounds: flow.rounds + 1, note: null })

export const withFindings = (flow: Flow, needs: string[], findings: string): Flow => ({
  ...flow,
  facts: [...flow.facts, `Looked up: ${needs.join('; ')}\n${findings.trim()}`],
})

export const withAnswers = (flow: Flow, answers: Answer[]): Flow => ({ ...flow, answers: [...flow.answers, ...answers] })

export const withNote = (flow: Flow, note: string): Flow => ({ ...flow, note })

/**
 * What follows a draft (`flow` already counts it): a file search, questions, a shorter redraft, or the prompt.
 * Context comes before questions, since the facts found may settle some of them.
 */
export function nextStep(flow: Flow, draft: Draft): Step {
  const words = draft.prompt === null ? 0 : wordCount(draft.prompt)
  if (draft.context.length === 0 && draft.questions.length === 0 && draft.prompt !== null && words <= MAX_WORDS) {
    return { kind: 'deliver', text: draft.prompt }
  }
  if (flow.rounds >= MAX_ROUNDS) return { kind: 'fail', reason: `no finished prompt after ${MAX_ROUNDS} drafts` }
  if (draft.context.length > 0) return { kind: 'explore', needs: draft.context }
  if (draft.questions.length > 0) {
    // The budget holds even when the drafter asks past it: only the first questions that fit are asked.
    const left = questionsLeft(flow)
    if (left === 0) return { kind: 'redraft', note: NO_QUESTIONS_NOTE }
    return { kind: 'ask', questions: draft.questions.slice(0, left) }
  }
  return { kind: 'redraft', note: shortenNote(words) }
}
