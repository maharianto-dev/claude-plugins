import { test, expect } from 'claude-code/testing'
import { classifyPrompt, parseAnswer } from './classify'
import { feedbackOf, maySave } from './feedback'
import { saveArgv } from './save'

const LEAD =
  "The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, " +
  'the new_string was NOT written to the file). To tell you how to proceed, the user said:\n'

test('feedback is the text after the lead', () => {
  expect(feedbackOf(`${LEAD}save as new cool feature`)).toBe('save as new cool feature')
})

test("the engine's trailing note is not part of the feedback", () => {
  const note = "\nNote: The user's next message may contain a correction or preference. Pay close attention."
  expect(feedbackOf(`${LEAD}save it${note}`)).toBe('save it')
})

test('a rejection without typed text has no feedback', () => {
  expect(feedbackOf('The user doesn\'t want to proceed with this tool use. STOP what you are doing.')).toBe(null)
  expect(feedbackOf(`${LEAD}   `)).toBe(null)
})

test('only feedback with a save-like word goes to the model', () => {
  expect(maySave('save using the name new cool feature')).toBe(true)
  expect(maySave('keep this one, call it cool feature v2')).toBe(true)
  expect(maySave('Store it for later')).toBe(true)
  expect(maySave('use postgres instead of sqlite')).toBe(false)
})

test('a save answer carries the name', () => {
  expect(parseAnswer('{"save": true, "name": "new cool feature"}')).toEqual({ isSave: true, name: 'new cool feature' })
  expect(parseAnswer('```json\n{"save": true, "name": " v2 "}\n```')).toEqual({ isSave: true, name: 'v2' })
})

test('a non-save answer', () => {
  expect(parseAnswer('{"save": false}')).toEqual({ isSave: false })
})

test('a malformed answer throws', () => {
  expect(() => parseAnswer('sure, saving it')).toThrow()
  expect(() => parseAnswer('{"name": "x"}')).toThrow('not {"save": boolean}')
  expect(() => parseAnswer('{"save": true}')).toThrow('no name')
})

test('the prompt holds the feedback and a bounded plan', () => {
  const prompt = classifyPrompt('save it', 'x'.repeat(10_000))
  expect(prompt).toContain('<message>\nsave it\n</message>')
  expect(prompt).toContain('A message about the files, code or data the plan works on is a change to the plan')
  expect(prompt.length).toBeLessThan(8_000)
})

test('the save command pins the project root', () => {
  expect(saveArgv('/plugin', '/proj', 'new cool feature', '/plans/p.md')).toEqual([
    '/plugin/scripts/save-plan.sh', '--root', '/proj', 'new cool feature', '/plans/p.md',
  ])
})
