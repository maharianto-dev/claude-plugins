import { test, expect } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'

const PLAN_FILE = '/home/u/.claude/plans/plan.md'
const SAVED = '/proj/PLANS/20261002-143005-new-cool-feature.md'
const USAGE = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }

const rejection = (typed: string) =>
  "The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, " +
  `the new_string was NOT written to the file). To tell you how to proceed, the user said:\n${typed}`

type World = { argv: string[][]; toasts: string[]; asked: string[] }

// The engine beneath the plugin: a review screen rejected with `typed`, a model answering `answer`.
function world(on: On, typed: string, answer: string): World {
  const w: World = { argv: [], toasts: [], asked: [] }
  on('tool.call', { tool: 'ExitPlanMode' }, () => ({ isError: true, result: undefined, text: rejection(typed) }))
  on('prompt.attachment', (_$, e) => ({ text: e.text }))
  on('fs.read', () => ({ value: '# Plan\n\nAdd a cool feature.' }))
  on('model.complete', (_$, e) => {
    w.asked.push(e.prompt)
    return { value: { isAnswered: true as const, text: answer, usage: USAGE } }
  })
  on('session.root', () => ({ value: '/proj' }))
  on('process.run', (_$, e) => {
    w.argv.push([...e.argv])
    return { value: { exitCode: 0, stdout: `${SAVED}\n`, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('ui.toast', (_$, e) => {
    w.toasts.push(e.text)
    return { value: undefined }
  })
  return w
}

async function seePlanFile($: Engine) {
  await $.prompt.attachment({
    type: 'plan_mode',
    text: 'Plan mode is active.',
    origin: { kind: 'engine' },
    detail: { reminder: 'full', planFilePath: PLAN_FILE, hasPlan: true },
  })
}

test('a save request typed under "No, keep planning" saves the plan and stops', async ($, on) => {
  const w = world(on, 'save using the name new cool feature', '{"save": true, "name": "new cool feature"}')
  await seePlanFile($)
  const result = await $.tool.call({ tool: 'ExitPlanMode' })

  expect(w.asked[0]).toContain('save using the name new cool feature')
  expect(w.argv).toEqual([[expect.stringMatching(/\/scripts\/save-plan\.sh$/), '--root', '/proj', 'new cool feature', PLAN_FILE]])
  expect(w.toasts).toEqual([`Plan saved: ${SAVED}`])
  expect(result.deny).toContain(`saved it to ${SAVED}`)
  expect(result.deny).toContain('do not implement it')
})

test('feedback the model says is not a save goes to Claude as it was', async ($, on) => {
  const w = world(on, 'save the user data before the API call', '{"save": false}')
  await seePlanFile($)
  const result = await $.tool.call({ tool: 'ExitPlanMode' })

  expect(w.argv).toEqual([])
  expect(result.deny).toBe(undefined)
  expect(result.text).toContain('save the user data before the API call')
})

test('feedback without a save-like word never reaches the model', async ($, on) => {
  const w = world(on, 'use postgres instead', '{"save": true, "name": "x"}')
  await seePlanFile($)
  const result = await $.tool.call({ tool: 'ExitPlanMode' })

  expect(w.asked).toEqual([])
  expect(result.text).toContain('use postgres instead')
})

test('a failure is shown and Claude is told not to build', async ($, on) => {
  const w = world(on, 'save it', 'not json')
  await seePlanFile($)
  const result = await $.tool.call({ tool: 'ExitPlanMode' })

  expect(w.argv).toEqual([])
  expect(w.toasts[0]).toContain('save-plan failed')
  expect(result.deny).toContain('the save-plan plugin failed')
  expect(result.deny).toContain('Do not implement the plan')
})

test('without a recorded plan file the save fails loudly', async ($, on) => {
  const w = world(on, 'save it', '{"save": true, "name": "x"}')
  const result = await $.tool.call({ tool: 'ExitPlanMode' })

  expect(w.toasts[0]).toContain('no plan file was recorded')
  expect(result.deny).toContain('no plan file was recorded')
})
