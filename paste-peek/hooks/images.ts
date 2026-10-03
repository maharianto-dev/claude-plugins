// Claude caches a pasted image as <tmp>/<project>/<session_id>/images/<n>.png.
export const tmpRoot = (tmpDir: string | undefined, uid: string): string =>
  tmpDir !== undefined && tmpDir !== '' ? tmpDir : `/tmp/claude-${uid.trim()}`

// Argv that lists the session's images folder under the temp root, whatever the project folder is.
export const findImagesArgv = (root: string, sessionId: string): string[] =>
  ['find', root, '-maxdepth', '3', '-type', 'd', '-path', `*/${sessionId}/images`]

export const firstLine = (stdout: string): string | null => stdout.split('\n').find(l => l !== '') ?? null

export const imagePath = (dir: string, n: number): string => `${dir}/${n}.png`
