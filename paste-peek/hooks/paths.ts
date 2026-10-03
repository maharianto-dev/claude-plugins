const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|tiff?|heic|heif|avif|ico)$/i

// A path pasted from a file manager arrives quoted or with backslash-escaped spaces.
const unquote = (text: string): string => {
  const quoted = /^(['"])(.*)\1$/.exec(text)
  return quoted ? quoted[2]! : text.replace(/\\(.)/g, '$1')
}

// What an edit inserted, if it is one absolute or ~ path; null otherwise.
export const pastedPath = (inserted: string): string | null => {
  const text = inserted.trim()
  if (text.length < 2 || text.includes('\n')) return null
  const path = unquote(text)
  return path.startsWith('/') || path.startsWith('~/') ? path : null
}

export const expandHome = (path: string, home: string): string =>
  path.startsWith('~/') ? `${home}${path.slice(1)}` : path

export const isImagePath = (path: string): boolean => IMAGE_EXT.test(path)

export const baseName = (path: string): string => path.slice(path.lastIndexOf('/') + 1)
