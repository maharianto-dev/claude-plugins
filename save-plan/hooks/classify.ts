import type { ModelCompleteResult } from 'claude-code'

export type SaveRequest = { isSave: false } | { isSave: true; name: string }

// Enough of the plan for the model to name it.
const PLAN_CHARS = 6000

export function classifyPrompt(feedback: string, plan: string): string {
  return [
    'A user reviewing a plan typed the message below instead of approving the plan.',
    'Decide whether the message asks to keep this plan document itself for later, in any wording: "save it",',
    '"save as X", "save using the name X", "keep this one, call it X", "store the plan for later".',
    'A message about the files, code or data the plan works on is a change to the plan, not a save request,',
    'even when it says save, keep, name or call. These are changes, not save requests:',
    '"save the user data before the API call", "save the file with a trailing newline and name it greeting.txt',
    'instead", "call it UserService instead of UserManager", "keep the old endpoint".',
    'When it is unclear whether the message means the plan document itself, it is not a save request.',
    'For a save request, give the name the user asked for, as they wrote it. If they gave none, make one:',
    "2 to 5 words that sum up the plan's goal.",
    'Answer with JSON only, no prose and no code fence: {"save": true, "name": "<name>"} or {"save": false}.',
    '',
    '<message>',
    feedback,
    '</message>',
    '',
    '<plan>',
    plan.slice(0, PLAN_CHARS),
    '</plan>',
  ].join('\n')
}

export function parseAnswer(text: string): SaveRequest {
  const json = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const answer: unknown = JSON.parse(json)
  if (typeof answer !== 'object' || answer === null || !('save' in answer) || typeof answer.save !== 'boolean') {
    throw new Error(`model answer is not {"save": boolean}: ${text}`)
  }
  if (!answer.save) return { isSave: false }
  if (!('name' in answer) || typeof answer.name !== 'string' || answer.name.trim() === '') {
    throw new Error(`model answer has no name: ${text}`)
  }
  return { isSave: true, name: answer.name.trim() }
}

/** The model call that classifies the feedback: a small model, little effort, a short answer. */
export const classifyAsk = (feedback: string, plan: string) => ({
  model: 'haiku',
  prompt: classifyPrompt(feedback, plan),
  effort: 'low',
  maxTokens: 200,
  timeoutMs: 20_000,
}) as const

export function requestOf(reply: ModelCompleteResult): SaveRequest {
  if (!reply.isAnswered) throw new Error(`model call failed: ${reply.reason}`)
  return parseAnswer(reply.text)
}
