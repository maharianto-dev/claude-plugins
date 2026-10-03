import { test, expect } from 'claude-code/testing'
import { headerArgv, pngSize } from './png'
import { findImagesArgv, firstLine, imagePath, tmpRoot } from './images'

// "IHDR", then 1920 x 1080 as big-endian words, as `od -tu1` prints them.
const OD = '  73  72  68  82   0   0   7 128   0   0   4  56\n'

test('the size comes from the IHDR chunk', () => {
  expect(pngSize(OD)).toEqual({ width: 1920, height: 1080 })
  expect(headerArgv('/a.png')).toEqual(['od', '-An', '-tu1', '-j12', '-N12', '/a.png'])
})

test('a file that is not a PNG fails loudly', () => {
  expect(() => pngSize('  60  72  68  82   0   0   7 128   0   0   4  56')).toThrow('not a PNG')
  expect(() => pngSize('')).toThrow('not a PNG')
})

test('the temp root is the override, or /tmp/claude-<uid>', () => {
  expect(tmpRoot('/var/t', '1000\n')).toBe('/var/t')
  expect(tmpRoot(undefined, '1000\n')).toBe('/tmp/claude-1000')
  expect(tmpRoot('', '7')).toBe('/tmp/claude-7')
})

test('the images folder is found by session id, and numbered files sit in it', () => {
  expect(findImagesArgv('/tmp/claude-1000', 'abc')).toEqual(['find', '/tmp/claude-1000', '-maxdepth', '3', '-type', 'd', '-path', '*/abc/images'])
  expect(firstLine('/tmp/claude-1000/proj/abc/images\n')).toBe('/tmp/claude-1000/proj/abc/images')
  expect(firstLine('')).toBeNull()
  expect(imagePath('/d', 3)).toBe('/d/3.png')
})
