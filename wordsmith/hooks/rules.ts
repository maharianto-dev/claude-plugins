import type { Flow } from './flow'

export const MAX_WORDS = 300
/** Questions per interview, all drafts together. */
export const MAX_QUESTIONS = 5

/** What every drafter follows: the system prompt of a model call, the head of a subagent's task. */
export const RULES = [
  'You are a prompt engineer. Turn the user\'s rough request into a prompt for an AI assistant.',
  '',
  'Find what the user wants: the context, the role the assistant should take, the task, the goal,',
  'the constraints and how to validate the result.',
  '',
  'Never assume. A missing or ambiguous point becomes a question for the user, with 2 to 4 concrete',
  'options and a header of at most 12 characters. The user can always type their own answer, so do not',
  'add an "Other" option. A fact that the project\'s files can answer (language, framework, layout,',
  'existing conventions) goes in "context" for a file search instead of becoming a question.',
  'Do not ask again what the facts or the answers below already settle.',
  '',
  `You may ask at most ${MAX_QUESTIONS} questions in the whole interview; the message says how many are left.`,
  'Ask only about the points that change the result the most, all in one draft, most important first.',
  'A lesser open point is not guessed: leave it out of the prompt, or name it in ## Constraints as the',
  'assistant\'s to settle with the user. With no questions left, write the final prompt.',
  '',
  'Reply only with JSON, no prose and no code fence:',
  '{"context": [string], "questions": [{"question": string, "header": string, "options": [string]}], "prompt": string | null}',
  '"prompt" is non-null only when "context" and "questions" are both empty.',
  '',
  `The final prompt is Markdown with the sections ## Role, ## Goal, ## Context, ## Task, ## Constraints`,
  `and ## Validation, at most ${MAX_WORDS} words, and holds only what the user said or confirmed and the facts found.`,
].join('\n')

const section = (tag: string, lines: string[]) => (lines.length === 0 ? [] : [`<${tag}>`, ...lines, `</${tag}>`, ''])

/** The drafting message: the request and everything learned so far, whole, since each draft starts fresh. */
export function draftMessage(flow: Flow): string {
  return [
    ...section('request', [flow.request]),
    ...section('facts', flow.facts),
    ...section('answers', flow.answers.map(a => `Q: ${a.question}\nA: ${a.answer}`)),
    `Questions left: ${questionsLeft(flow)}`,
    '',
    ...section('note', flow.note === null ? [] : [flow.note]),
  ].join('\n').trim()
}

/** A subagent gets the rules in its task, after its own system prompt. */
export const agentTask = (flow: Flow) => `${RULES}\n\n${draftMessage(flow)}`

export const questionsLeft = (flow: Flow) => Math.max(0, MAX_QUESTIONS - flow.answers.length)

export const NO_QUESTIONS_NOTE = 'No questions are left. Write the final prompt now from what is settled, with no questions.'

export const shortenNote = (words: number) =>
  `Your last prompt had ${words} words. Write it again in at most ${MAX_WORDS} words, keeping every section.`
