export const PREVIEW_LINES = 12
export const PREVIEW_COLUMNS = 40
// How much of a file the preview reads.
export const HEAD_BYTES = 2048

// The first lines of a file's head, or null when the head isn't text.
// The head is cut at a byte count, so one U+FFFD at its end is a split character, not binary.
export const previewLines = (head: string): string[] | null => {
  if (head.includes('\0') || (head.match(/�/g)?.length ?? 0) > 1) return null
  return head
    .split('\n')
    .slice(0, PREVIEW_LINES)
    .map(line => line.replace(/\r$/, '').replace(/\t/g, '  ').slice(0, PREVIEW_COLUMNS))
}
