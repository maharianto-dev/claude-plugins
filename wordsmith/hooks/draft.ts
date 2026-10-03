import { stripFence } from './trigger'

export type Question = { question: string; header: string; options: string[] }
export type Draft = { context: string[]; questions: Question[]; prompt: string | null }

const HEADER_CHARS = 12

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

const strings = (v: unknown, what: string): string[] => {
  if (!Array.isArray(v) || v.some(s => typeof s !== 'string')) throw new Error(`draft ${what} is not a list of strings`)
  return v.map(s => s.trim()).filter(s => s !== '')
}

function questionOf(v: unknown): Question {
  if (!isObject(v) || typeof v.question !== 'string' || typeof v.header !== 'string') {
    throw new Error(`draft question is not {question, header, options}: ${JSON.stringify(v)}`)
  }
  const options = strings(v.options, 'options')
  if (options.length < 2 || options.length > 4) throw new Error(`draft question has ${options.length} options, not 2-4`)
  return { question: v.question.trim(), header: v.header.trim().slice(0, HEADER_CHARS).trim(), options }
}

/** A subagent may wrap its JSON in a sentence or two of prose: take the outermost object. */
function jsonOf(text: string): string {
  const fenced = stripFence(text)
  const start = fenced.indexOf('{')
  const end = fenced.lastIndexOf('}')
  return start === -1 || end < start ? fenced : fenced.slice(start, end + 1)
}

/** The drafter's reply, checked against the shape the rules ask for. */
export function parseDraft(text: string): Draft {
  let answer: unknown
  try {
    answer = JSON.parse(jsonOf(text))
  } catch {
    throw new Error(`drafter reply is not JSON: ${text.slice(0, 200)}`)
  }
  if (!isObject(answer)) throw new Error(`drafter reply is not an object: ${text.slice(0, 200)}`)
  if (!Array.isArray(answer.questions)) throw new Error('draft questions is not a list')
  if (answer.prompt !== null && typeof answer.prompt !== 'string') throw new Error('draft prompt is not a string or null')
  const draft: Draft = {
    context: strings(answer.context, 'context'),
    questions: answer.questions.map(questionOf),
    prompt: typeof answer.prompt === 'string' && answer.prompt.trim() !== '' ? answer.prompt.trim() : null,
  }
  if (draft.context.length === 0 && draft.questions.length === 0 && draft.prompt === null) {
    throw new Error('draft has no context, no questions and no prompt')
  }
  return draft
}

/** Words as a reader counts them: Markdown marks like `##` and `-` are not words. */
export const wordCount = (text: string) => (text.match(/\S+/g) ?? []).filter(w => /[\p{L}\p{N}]/u.test(w)).length
