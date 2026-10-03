import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { FilePaste, Item } from '../types'
import { findImagesArgv, firstLine, imagePath, tmpRoot } from './images'
import type { ImageInfo } from './items'
import { pickColor } from './colors'
import { buildItems } from './items'
import { fitTiles } from './layout'
import { expandHome, isImagePath, pastedPath } from './paths'
import { headerArgv, pngSize } from './png'
import { HEAD_BYTES, previewLines } from './preview'
import { Strip } from './strip'
import { parseTokens } from './tokens'

const items = atom({ plugin: 'paste-peek', key: 'items-v1' } as const, [])
const files = atom({ plugin: 'paste-peek', key: 'files-v1' } as const, [])

// Image pastes raise no prompt.edit, so the draft is polled.
const POLL_MS = 200

const run = async ($: EngineInterface, argv: string[]) => {
  const ran = await $.process.run(argv)
  if (ran.exitCode !== 0) throw new Error(`${argv[0]} exited ${ran.exitCode}: ${ran.stderr.trim()}`)
  return ran.stdout
}

// What the poll remembers between ticks: found images, item colors, the images folder, and the last items written.
type Memo = { images: Map<number, ImageInfo>; colors: Map<string, string>; dir: string | null; shown: string }

// The session's images folder; null while Claude hasn't cached an image yet.
const findImagesDir = async ($: EngineInterface): Promise<string | null> => {
  const uid = await run($, ['id', '-u'])
  const root = tmpRoot(await $.env.get('CLAUDE_CODE_TMPDIR'), uid)
  if (!(await $.fs.exists(root))) return null
  return firstLine(await run($, findImagesArgv(root, await $.session.id())))
}

// Looks up the cached files of the draft's image tags that aren't known yet; a missing file is retried next poll.
const lookUpImages = async ($: EngineInterface, memo: Memo, wanted: number[]) => {
  for (const n of wanted.filter(w => !memo.images.has(w))) {
    memo.dir ??= await findImagesDir($)
    if (memo.dir === null) return
    const path = imagePath(memo.dir, n)
    if (!(await $.fs.exists(path))) continue
    memo.images.set(n, { path, ...pngSize(await run($, headerArgv(path))) })
  }
}

const poll = async ($: EngineInterface, memo: Memo) => {
  const draft = (await $.prompt.read()).text
  await lookUpImages($, memo, parseTokens(draft).filter(t => t.kind === 'image').map(t => t.n))
  const all = await read($, files)
  const kept = all.filter(f => draft.includes(f.needle))
  if (kept.length !== all.length) await update($, files, () => kept)
  const colorOf = (key: string) => {
    if (!memo.colors.has(key)) memo.colors.set(key, pickColor(Math.random()))
    return memo.colors.get(key)!
  }
  const next = buildItems(draft, kept, memo.images, colorOf)
  const key = JSON.stringify(next)
  if (key === memo.shown) return
  memo.shown = key
  await update($, items, (): Item[] => next)
}

// Keeps the path and a preview of the file's head when an edit inserted one regular, non-image file.
const capture = async ($: EngineInterface, inserted: string) => {
  const typed = pastedPath(inserted)
  if (typed === null) return
  const path = expandHome(typed, (await $.env.get('HOME')) ?? '')
  if (isImagePath(path) || !(await $.fs.exists(path)) || (await $.fs.stat(path)).kind !== 'file') return
  const lines = previewLines(await run($, ['head', '-c', String(HEAD_BYTES), path]))
  const paste: FilePaste = { needle: inserted.trim(), path, lines }
  await update($, files, list => [...list.filter(f => f.needle !== paste.needle), paste])
}

export const register: Register = (on, options) => {
  const reservedRows = Number(options.reservedRows)
  const memo: Memo = { images: new Map(), colors: new Map(), dir: null, shown: '' }

  on('session.start', async ($, e, next) => {
    $.clock.every(POLL_MS, () => poll($, memo))
    return next(e)
  })

  // The edit is answered first and the file read runs in the background, so typing never waits.
  on('prompt.edit', async ($, e, next) => {
    const result = await next(e)
    capture($, e.inputText).catch(err => $.ui.toast(`paste-peek: ${err instanceof Error ? err.message : String(err)}`))
    return result
  })

  on('prompt.submit', async ($, e, next) => {
    memo.shown = ''
    await update($, files, () => [])
    await update($, items, (): Item[] => [])
    return next(e)
  })

  // paste-peek sits above whatever runs after it in the band.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, items)
    if (e.props.hasSurvey || list.length === 0 || e.surface !== 'terminal') return next(e)

    const { Box, Text, Image } = $.ui.resolve(e)
    const tiles = fitTiles(list, e.props.maxRows - reservedRows, e.props.bodyColumns)
    return (
      <Box flexDirection="column">
        {Strip({ Box, Text, Image }, tiles)}
        {await next(e)}
      </Box>
    )
  })
}
