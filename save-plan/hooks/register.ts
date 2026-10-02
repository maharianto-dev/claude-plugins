import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { classifyAsk, requestOf } from './classify'
import { feedbackOf, maySave } from './feedback'
import { saveArgv, savedPathOf } from './save'

// The main loop's plan file, taken from the plan-mode reminder each request carries.
const planFile = atom({ plugin: 'save-plan', key: 'plan-file' } as const, null)

const savedNote = (path: string) =>
  `The user chose to save this plan for later instead of approving it. The save-plan plugin saved it to ${path}. ` +
  'Do not save it again, do not change the plan and do not implement it. ' +
  'Reply with one line naming the saved file, then end your turn.'

const failedNote = (reason: string, feedback: string) =>
  `The user asked to save this plan, but the save-plan plugin failed: ${reason}. ` +
  `The user's message was: "${feedback}". Tell the user the save failed and why, then wait. Do not implement the plan.`

export const register: Register = on => {
  on('prompt.attachment', { type: 'plan_mode' }, async ($, e, next) => {
    const path = e.detail?.planFilePath
    if (e.agentId === undefined && path !== undefined) await update($, planFile, () => path)
    return next(e)
  })

  // "No, keep planning" with a save request typed in its box saves the plan instead of sending it to Claude.
  on('tool.call', { tool: 'ExitPlanMode' }, async ($, e, next) => {
    const ran = await next(e)
    if (e.agentId !== undefined || ran.isError !== true || ran.text === undefined) return ran
    const feedback = feedbackOf(ran.text)
    if (feedback === null || !maySave(feedback)) return ran

    try {
      const path = await read($, planFile)
      if (path === null) throw new Error('no plan file was recorded for this session')
      const plan = await $.fs.read(path)
      const request = requestOf(await $.model.complete(classifyAsk(feedback, plan)))
      if (!request.isSave) return ran
      const argv = saveArgv($.plugin.root, await $.session.root(), request.name, path)
      const saved = savedPathOf(await $.process.run(argv))
      $.ui.toast(`Plan saved: ${saved}`)
      return { deny: savedNote(saved) }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      $.ui.toast(`save-plan failed: ${reason}`)
      return { deny: failedNote(reason, feedback) }
    }
  })
}
