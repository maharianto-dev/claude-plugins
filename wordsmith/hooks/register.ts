import type { EngineInterface, ModelEffort, Register } from 'claude-code'

import { AGENT_NAME, agentFiles, exploreTask } from './agents'
import type { Question } from './draft'
import { parseDraft } from './draft'
import type { Answer, Flow } from './flow'
import { drafted, nextStep, startFlow, withAnswers, withFindings, withNote } from './flow'
import { RULES, agentTask, draftMessage } from './rules'
import { SEAL } from './seal'
import { classifyAsk, findTrigger, verdictOf } from './trigger'

const reasonOf = (err: unknown) => (err instanceof Error ? err.message : String(err))

// The task names the subagents show under.
const DRAFTING = 'wordsmith: drafting the prompt'
const LOOKING_UP = 'wordsmith: project facts'

type Waiter = { resolve: (answer: string) => void; reject: (err: Error) => void }
type Ended = { reason: string; answer: string; detail: string }

// One session's in-flight work: who waits on each subagent this plugin started, by its id, and every such id,
// to keep their reports from Claude. While a spawn is starting (`starting`), a subagent's end that no one waits
// on yet is kept in `early`. `effort` is the main loop's, as its last request named it.
type Ctx = {
  waiting: Map<string, Waiter>
  early: Map<string, Ended>
  starting: number
  spawned: Set<string>
  effort: ModelEffort | undefined
  isBusy: boolean
}

// The text of an `<agent-message from="…">` prompt, without its tags.
const reportOf = (text: string) => text.replace(/<\/?agent-message[^>]*>/g, '').trim()

const settle = (waiter: Waiter, ended: Ended) => {
  if (ended.reason !== 'answer') waiter.reject(new Error(`subagent turn ended: ${ended.reason} (${ended.detail})`))
  else waiter.resolve(ended.answer)
}

// A spawn resolves once the subagent started; its answer is its own turn.complete, carrying the same id.
const spawnAndWait = async ($: EngineInterface, ctx: Ctx, subagentType: string, prompt: string, description: string) => {
  ctx.starting++
  const started = await $.agent.spawn({ subagentType, prompt, description }).finally(() => ctx.starting--)
  if (started.deny !== undefined) throw new Error(`${subagentType} subagent refused: ${started.deny}`)
  const id = started.agentId
  if (id === undefined) throw new Error(`${subagentType} subagent did not start`)
  ctx.spawned.add(id)
  const ended = ctx.early.get(id)
  if (ctx.starting === 0) ctx.early.clear()
  return new Promise<string>((resolve, reject) => {
    if (ended === undefined) ctx.waiting.set(id, { resolve, reject })
    else settle({ resolve, reject }, ended)
  })
}

const askModel = async ($: EngineInterface, ctx: Ctx, flow: Flow) => {
  const reply = await $.model.complete({
    model: await $.session.model(),
    system: RULES,
    prompt: draftMessage(flow),
    maxTokens: 4000,
    ...(ctx.effort === undefined ? {} : { effort: ctx.effort }),
  })
  if (!reply.isAnswered) throw new Error(`drafting call failed: ${reply.reason}`)
  return reply.text
}

const hasAgent = async ($: EngineInterface) => {
  const home = await $.env.get('HOME')
  if (home === undefined) throw new Error('HOME is not set')
  for (const path of agentFiles(await $.session.root(), home)) if (await $.fs.exists(path)) return true
  return false
}

const ask = async ($: EngineInterface, questions: Question[]) => {
  const answers: Answer[] = []
  for (const q of questions) {
    const answer = await $.ui.ask(q.question, { options: q.options, header: q.header }).catch((err: unknown) => {
      throw new Error(`question dismissed (${reasonOf(err)})`)
    })
    answers.push({ question: q.question, answer })
  }
  return answers
}

const interview = async ($: EngineInterface, ctx: Ctx, request: string) => {
  const withAgent = await hasAgent($)
  let flow = startFlow(request)
  for (;;) {
    const reply = withAgent
      ? await spawnAndWait($, ctx, AGENT_NAME, agentTask(flow), DRAFTING)
      : await askModel($, ctx, flow)
    flow = drafted(flow)
    const step = nextStep(flow, parseDraft(reply))
    if (step.kind === 'fail') throw new Error(step.reason)
    if (step.kind === 'deliver') return step.text
    if (step.kind === 'redraft') flow = withNote(flow, step.note)
    if (step.kind === 'ask') flow = withAnswers(flow, await ask($, step.questions))
    if (step.kind === 'explore') {
      const task = exploreTask(step.needs, await $.session.root())
      flow = withFindings(flow, step.needs, await spawnAndWait($, ctx, 'Explore', task, LOOKING_UP))
    }
  }
}

const deliver = async ($: EngineInterface, text: string) => {
  const filled = await $.prompt.fill({ text, mode: 'replace' })
  if (!filled.isFilled) throw new Error(`the input box did not take the prompt (${filled.refusal ?? 'refused'})`)
  $.ui.toast('wordsmith: prompt ready, review and press Enter')
}

const fail = async ($: EngineInterface, err: unknown, original: string | null) => {
  if (original !== null) await $.prompt.fill({ text: original, mode: 'replace' })
  $.ui.toast(`wordsmith failed: ${reasonOf(err)}`, { timeoutMs: 8000 })
}

// Runs one interview in the background; `original` is the user's prompt to put back when it fails.
const start = ($: EngineInterface, ctx: Ctx, request: string, original: string | null) => {
  ctx.isBusy = true
  $.ui.toast('wordsmith: drafting…')
  interview($, ctx, request)
    .then(text => deliver($, text))
    .catch((err: unknown) => fail($, err, original))
    .finally(() => {
      ctx.isBusy = false
    })
}

export const register: Register = on => {
  const ctx: Ctx = { waiting: new Map(), early: new Map(), starting: 0, spawned: new Set(), effort: undefined, isBusy: false }

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'wordsmith',
      description: 'Turn a rough prompt into a structured one, asking about every gap',
      argumentHint: '<rough prompt>',
    })
    return next(e)
  })

  on('command.run', { command: 'wordsmith' }, ($, e) => {
    const request = e.args.trim()
    if (request === '') return { text: 'Usage: /wordsmith <rough prompt>' }
    if (ctx.isBusy) return { text: 'wordsmith is already drafting a prompt.' }
    start($, ctx, request, null)
    return { text: 'Drafting a prompt. Answer the questions; the result lands in the input box, unsent.' }
  })

  on('prompt.submit', async ($, e, next) => {
    // A finished subagent's report (`<agent-message from="<id>">`) is the interview's, not Claude's.
    const reporter = e.origin.kind === 'composer' ? undefined : [...ctx.spawned].find(id => e.text.includes(`from="${id}"`))
    if (reporter !== undefined) {
      // Its turns can end with no text: the report is then the only place the answer is.
      const ended = { reason: 'answer', answer: reportOf(e.text), detail: 'agent report' }
      const waiter = ctx.waiting.get(reporter)
      if (waiter !== undefined) {
        ctx.waiting.delete(reporter)
        settle(waiter, ended)
      } else if (ctx.starting > 0) ctx.early.set(reporter, ended)
      return { drop: 'wordsmith: subagent report kept out of the conversation' }
    }
    if (e.origin.kind !== 'composer' || e.text.trimStart().startsWith('/') || ctx.isBusy) return next(e)
    const named = await findTrigger(e.text, SEAL)
    if (!named.isNamed) return next(e)
    try {
      const verdict = verdictOf(await $.model.complete(classifyAsk(named.text)))
      if (!verdict.improve) return next(e)
      start($, ctx, verdict.request, e.text)
      return { drop: 'wordsmith: drafting a prompt from this message' }
    } catch (err) {
      $.ui.toast(`wordsmith: trigger check failed, message sent as typed (${reasonOf(err)})`, { timeoutMs: 8000 })
      return next(e)
    }
  })

  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined && typeof e.effort === 'string') ctx.effort = e.effort
    return yield* next(e)
  })

  on('turn.complete', async ($, e, next) => {
    // A subagent's loop can end a turn with no text (a tool call, thinking only): its answer is a later turn.
    const isSilent = e.reason === 'answer' && e.answer.trim() === ''
    if (e.agentId !== undefined && !isSilent) {
      const waiter = ctx.waiting.get(e.agentId)
      const ended = { reason: e.reason, answer: e.answer, detail: `turn ${e.turnId}, ${e.durationMs} ms, ${JSON.stringify(e.usage ?? null)}` }
      if (waiter !== undefined) {
        ctx.waiting.delete(e.agentId)
        settle(waiter, ended)
      } else if (ctx.starting > 0) ctx.early.set(e.agentId, ended)
    }
    return next(e)
  })
}
