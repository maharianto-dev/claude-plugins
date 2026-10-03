import { test, expect } from 'claude-code/testing'

import { agentFiles, exploreTask } from './agents'
import type { Draft } from './draft'
import { parseDraft, wordCount } from './draft'
import { MAX_ROUNDS, drafted, nextStep, startFlow, withAnswers, withFindings } from './flow'
import { MAX_QUESTIONS, NO_QUESTIONS_NOTE, draftMessage } from './rules'
import { isSealed, sealOf } from './seal'
import { findTrigger, parseVerdict, tokensOf } from './trigger'

// A stand-in for a hidden name, with its digest worked out by the test itself.
const STAND_IN = 'quillmaster'

const QUESTION = { question: 'Which database?', header: 'Database', options: ['Postgres', 'SQLite'] }
const draftOf = (d: Partial<Draft>): Draft => ({ context: [], questions: [], prompt: null, ...d })

test('tokens drop punctuation and case', () => {
  expect(tokensOf('WS: improve this, please!')).toEqual(['ws', 'improve', 'this', 'please'])
  expect(tokensOf('Wordsmith—make it better')).toEqual(['wordsmith', 'make', 'it', 'better'])
})

test('"ws" inside another word is not a trigger', async () => {
  expect((await findTrigger('open the wss socket and the news feed', 'x')).isNamed).toBe(false)
  expect((await findTrigger('ws, tidy this up', 'x')).isNamed).toBe(true)
  expect((await findTrigger('ask Wordsmith: write a prompt', 'x')).isNamed).toBe(true)
})

test('a sealed name matches its own digest only', async () => {
  const seal = await sealOf(STAND_IN)
  expect(seal).toMatch(/^[0-9a-f]{64}$/)
  expect(await isSealed(STAND_IN, seal)).toBe(true)
  expect(await isSealed('quillmastery', seal)).toBe(false)
})

test('a sealed name triggers anywhere and reads as wordsmith', async () => {
  const seal = await sealOf(STAND_IN)
  expect(await findTrigger('Quillmaster: draft a deploy prompt', seal)).toEqual({
    isNamed: true,
    text: 'wordsmith: draft a deploy prompt',
  })
  expect(await findTrigger('please ask quillmaster to polish this', seal)).toEqual({
    isNamed: true,
    text: 'please ask wordsmith to polish this',
  })
})

test('the classifier verdict', () => {
  expect(parseVerdict('{"improve": false}')).toEqual({ improve: false })
  expect(parseVerdict('```json\n{"improve": true, "request": " add caching "}\n```')).toEqual({
    improve: true,
    request: 'add caching',
  })
  expect(() => parseVerdict('{"improve": true}')).toThrow('no request')
  expect(() => parseVerdict('{"yes": 1}')).toThrow('not {"improve": boolean}')
})

test('a draft parses into context, questions and prompt', () => {
  const text = JSON.stringify({ context: ['the test runner'], questions: [{ ...QUESTION, header: 'A very long header' }], prompt: null })
  expect(parseDraft(text)).toEqual({
    context: ['the test runner'],
    questions: [{ ...QUESTION, header: 'A very long' }],
    prompt: null,
  })
  expect(parseDraft('{"context": [], "questions": [], "prompt": "## Role\\nx"}').prompt).toBe('## Role\nx')
  expect(parseDraft('Here is the draft:\n{"context": [], "questions": [], "prompt": "p"}\nDone.').prompt).toBe('p')
})

test('a draft of the wrong shape throws', () => {
  expect(() => parseDraft('here is your prompt')).toThrow('not JSON')
  expect(() => parseDraft('[]')).toThrow('not an object')
  expect(() => parseDraft('{"context": [], "questions": {}, "prompt": null}')).toThrow('questions is not a list')
  expect(() => parseDraft('{"context": "x", "questions": [], "prompt": null}')).toThrow('context is not a list')
  expect(() => parseDraft('{"context": [], "questions": [{"question": "q", "header": "h", "options": ["a"]}], "prompt": null}'))
    .toThrow('1 options')
  expect(() => parseDraft('{"context": [], "questions": [], "prompt": null}')).toThrow('no context, no questions')
})

test('Markdown marks are not counted as words', () => {
  expect(wordCount('## Role\n- You are a **reviewer**.\n\n## Goal')).toBe(6)
})

test('the next step follows the draft', () => {
  const flow = drafted(startFlow('build a todo app'))
  expect(nextStep(flow, draftOf({ context: ['framework'], questions: [QUESTION] }))).toEqual({ kind: 'explore', needs: ['framework'] })
  expect(nextStep(flow, draftOf({ questions: [QUESTION] }))).toEqual({ kind: 'ask', questions: [QUESTION] })
  expect(nextStep(flow, draftOf({ prompt: '## Goal\nShip it.' }))).toEqual({ kind: 'deliver', text: '## Goal\nShip it.' })
  const long = nextStep(flow, draftOf({ prompt: 'word '.repeat(301) }))
  expect(long.kind).toBe('redraft')
  expect(long.kind === 'redraft' && long.note).toContain('301 words')
})

test('the round cap fails loudly, but a finished prompt still lands', () => {
  let flow = startFlow('x')
  for (let i = 0; i < MAX_ROUNDS; i++) flow = drafted(flow)
  expect(nextStep(flow, draftOf({ questions: [QUESTION] }))).toEqual({ kind: 'fail', reason: `no finished prompt after ${MAX_ROUNDS} drafts` })
  expect(nextStep(flow, draftOf({ prompt: 'done' })).kind).toBe('deliver')
})

test('questions stop at the budget, whatever the drafter asks', () => {
  const many = Array.from({ length: 7 }, (_, i) => ({ ...QUESTION, question: `Q${i}?` }))
  const first = nextStep(drafted(startFlow('x')), draftOf({ questions: many }))
  expect(first.kind === 'ask' && first.questions.map(q => q.question)).toEqual(['Q0?', 'Q1?', 'Q2?', 'Q3?', 'Q4?'])

  let flow = withAnswers(drafted(startFlow('x')), [{ question: 'a', answer: '1' }, { question: 'b', answer: '2' }, { question: 'c', answer: '3' }])
  const second = nextStep(flow, draftOf({ questions: many }))
  expect(second.kind === 'ask' && second.questions.length).toBe(MAX_QUESTIONS - 3)

  flow = withAnswers(flow, [{ question: 'd', answer: '4' }, { question: 'e', answer: '5' }])
  expect(nextStep(flow, draftOf({ questions: [QUESTION] }))).toEqual({ kind: 'redraft', note: NO_QUESTIONS_NOTE })
  expect(draftMessage(flow)).toContain('Questions left: 0')
})

test('the drafting message carries the whole history', () => {
  let flow = startFlow('build a todo app')
  flow = withFindings(flow, ['framework'], 'React 19 (package.json)')
  flow = withAnswers(flow, [{ question: 'Which database?', answer: 'Postgres' }])
  const message = draftMessage(flow)
  expect(message).toContain('<request>\nbuild a todo app\n</request>')
  expect(message).toContain('Looked up: framework\nReact 19 (package.json)')
  expect(message).toContain('Q: Which database?\nA: Postgres')
  expect(message).toContain(`Questions left: ${MAX_QUESTIONS - 1}`)
  expect(message).not.toContain('<note>')
})

test('agent files: the project first, then home', () => {
  expect(agentFiles('/proj', '/home/u')).toEqual(['/proj/.claude/agents/wordsmith.md', '/home/u/.claude/agents/wordsmith.md'])
  expect(exploreTask(['framework', 'test runner'], '/proj')).toContain('1. framework\n2. test runner')
})
