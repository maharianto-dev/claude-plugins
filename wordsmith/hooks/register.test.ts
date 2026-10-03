import { test, expect } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'

const USAGE = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
const PROMPT = '## Role\nYou are a developer.\n\n## Goal\nA todo app on Postgres.'
const QUESTION = { question: 'Which database?', header: 'Database', options: ['Postgres', 'SQLite'] }

const draft = (d: { context?: string[]; questions?: unknown[]; prompt?: string }) =>
  JSON.stringify({ context: d.context ?? [], questions: d.questions ?? [], prompt: d.prompt ?? null })

type Spawn = { subagentType: string; prompt: string }
type World = {
  completions: { model: string; system?: string; prompt: string }[]
  spawns: Spawn[]
  asked: string[]
  fills: string[]
  toasts: string[]
  /** Settles once the interview delivered or failed. */
  done: Promise<void>
}

type Setup = {
  /** The model's replies, in order: the classifier's first when the prompt is a trigger. */
  replies: string[]
  /** Whether the project has its own wordsmith agent. */
  hasAgent?: boolean
  /** The user's answer to each question; undefined dismisses it. */
  answer?: string
}

// The engine beneath the plugin.
function world(on: On, setup: Setup): World {
  let finish = () => {}
  const w: World = {
    completions: [], spawns: [], asked: [], fills: [], toasts: [],
    done: new Promise<void>(resolve => { finish = resolve }),
  }
  const replies = [...setup.replies]

  on('session.root', () => ({ value: '/proj' }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('env.get', () => ({ value: '/home/u' }))
  on('fs.exists', (_$, e) => ({ value: setup.hasAgent === true && e.path === '/proj/.claude/agents/wordsmith.md' }))
  on('model.complete', (_$, e) => {
    w.completions.push({ model: e.model, system: e.system, prompt: e.prompt })
    const text = replies.shift()
    if (text === undefined) throw new Error('the model was asked once too often')
    return { value: { isAnswered: true as const, text, usage: USAGE } }
  })
  // The test kit keeps a spawn answer's agentId to core, so no subagent's turn.complete can be raised here:
  // these tests check the spawn requests, and the answer's way back is checked in a real session.
  on('agent.spawn', (_$, e) => {
    w.spawns.push({ subagentType: e.subagentType ?? (e as unknown as { subagent_type: string }).subagent_type, prompt: e.prompt })
    return { model: 'claude-sonnet-5-5' }
  })
  // $.ui.ask is the AskUserQuestion tool, answered here as its dialog would be.
  on('tool.call', { tool: 'AskUserQuestion' }, (_$, e) => {
    const question = e.questions[0]!.question
    w.asked.push(question)
    if (setup.answer === undefined) return { isError: true, result: undefined, text: 'The user dismissed the question.' }
    return { result: { questions: e.questions, answers: { [question]: setup.answer } } }
  })
  on('prompt.fill', (_$, e) => {
    w.fills.push(e.text)
    return { isFilled: true }
  })
  on('ui.toast', (_$, e) => {
    w.toasts.push(e.text)
    if (e.text.startsWith('wordsmith: prompt ready') || e.text.startsWith('wordsmith failed')) finish()
    return { value: undefined }
  })
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  return w
}

const runCommand = ($: Engine, args: string) =>
  $.command.run({ command: 'wordsmith', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } })

const typed = ($: Engine, text: string) => $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } })

test('/wordsmith asks, redrafts and puts the prompt in the box', async ($, on) => {
  const w = world(on, { replies: [draft({ questions: [QUESTION] }), draft({ prompt: PROMPT })], answer: 'Postgres' })
  const ran = await runCommand($, 'build a todo app')
  await w.done

  expect(ran.text).toContain('Drafting a prompt')
  expect(w.completions[0]!.model).toBe('claude-opus-5-5')
  expect(w.completions[0]!.system).toContain('You are a prompt engineer')
  expect(w.completions[0]!.prompt).toContain('build a todo app')
  expect(w.asked).toEqual(['Which database?'])
  expect(w.completions[1]!.prompt).toContain('Q: Which database?\nA: Postgres')
  expect(w.fills).toEqual([PROMPT])
  expect(w.spawns).toEqual([])
})

test("with the user's agent file, the wordsmith subagent drafts", async ($, on) => {
  const w = world(on, { replies: [], hasAgent: true })
  await runCommand($, 'build a todo app')
  await w.done

  expect(w.spawns.map(s => s.subagentType)).toEqual(['wordsmith'])
  expect(w.spawns[0]!.prompt).toContain('You are a prompt engineer')
  expect(w.spawns[0]!.prompt).toContain('<request>\nbuild a todo app\n</request>')
  expect(w.completions).toEqual([])
})

test('a draft asking for context sends Explore with what it needs', async ($, on) => {
  const w = world(on, { replies: [draft({ context: ['Which UI framework does the project use?'] })] })
  await runCommand($, 'add a settings page')
  await w.done

  expect(w.spawns.map(s => s.subagentType)).toEqual(['Explore'])
  expect(w.spawns[0]!.prompt).toContain('1. Which UI framework does the project use?')
  expect(w.spawns[0]!.prompt).toContain('/proj')
})

test('a prompt naming ws for something else goes through unchanged', async ($, on) => {
  const w = world(on, { replies: ['{"improve": false}'] })
  const result = await typed($, 'fix the ws reconnect bug')

  expect(w.completions[0]!.model).toBe('haiku')
  expect(w.completions[0]!.prompt).toContain('fix the ws reconnect bug')
  expect(result.drop).toBe(undefined)
  expect(result.text).toBe('fix the ws reconnect bug')
})

test('a prompt not naming wordsmith never reaches the classifier', async ($, on) => {
  const w = world(on, { replies: [] })
  const result = await typed($, 'open the wss socket')

  expect(w.completions).toEqual([])
  expect(result.text).toBe('open the wss socket')
})

test('a trigger prompt is kept from Claude and drafted', async ($, on) => {
  const w = world(on, { replies: ['{"improve": true, "request": "add caching"}', draft({ prompt: PROMPT })] })
  const result = await typed($, 'ws improve this: add caching')
  await w.done

  expect(result.drop).toContain('wordsmith')
  expect(w.completions[1]!.prompt).toContain('<request>\nadd caching\n</request>')
  expect(w.fills).toEqual([PROMPT])
})

test('a dismissed question fails loudly and fills nothing', async ($, on) => {
  const w = world(on, { replies: [draft({ questions: [QUESTION] })] })
  await runCommand($, 'build a todo app')
  await w.done

  expect(w.toasts.at(-1)).toContain('wordsmith failed: question dismissed')
  expect(w.fills).toEqual([])
})

test("a failed trigger's message is put back in the box", async ($, on) => {
  const w = world(on, { replies: ['{"improve": true, "request": "add caching"}', 'not json'] })
  await typed($, 'ws improve this: add caching')
  await w.done

  expect(w.toasts.at(-1)).toContain('drafter reply is not JSON')
  expect(w.fills).toEqual(['ws improve this: add caching'])
})
