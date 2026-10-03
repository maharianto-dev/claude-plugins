// Argv that prints the 12 bytes after the PNG signature as decimals: "IHDR", width, height.
export const headerArgv = (path: string): string[] => ['od', '-An', '-tu1', '-j12', '-N12', path]

const IHDR = [73, 72, 68, 82]

// Pixel size from `headerArgv`'s output; throws when the file isn't a PNG.
export const pngSize = (odOutput: string): { width: number; height: number } => {
  const b = odOutput.trim().split(/\s+/).map(Number)
  if (b.length !== 12 || IHDR.some((v, i) => b[i] !== v)) throw new Error(`not a PNG header: ${odOutput.trim()}`)
  const word = (at: number) => ((b[at]! << 24) | (b[at + 1]! << 16) | (b[at + 2]! << 8) | b[at + 3]!) >>> 0
  return { width: word(4), height: word(8) }
}
