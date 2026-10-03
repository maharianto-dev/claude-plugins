import { test, expect } from 'claude-code/testing'
import { baseName, expandHome, isImagePath, pastedPath } from './paths'

test('one absolute or ~ path is a pasted path', () => {
  expect(pastedPath('/etc/hosts\n')).toBe('/etc/hosts')
  expect(pastedPath('~/notes/a.md')).toBe('~/notes/a.md')
})

test('quotes and escaped spaces are undone', () => {
  expect(pastedPath("'/home/u/my file.txt'")).toBe('/home/u/my file.txt')
  expect(pastedPath('/home/u/my\\ file.txt')).toBe('/home/u/my file.txt')
})

test('anything else is not a path', () => {
  expect(pastedPath('hello')).toBeNull()
  expect(pastedPath('/')).toBeNull()
  expect(pastedPath('a/b/c')).toBeNull()
  expect(pastedPath('/etc/hosts\n/etc/passwd')).toBeNull()
})

test('home expands only for a leading ~/', () => {
  expect(expandHome('~/a', '/home/u')).toBe('/home/u/a')
  expect(expandHome('/x/~/a', '/home/u')).toBe('/x/~/a')
})

test('image paths are recognised by extension, case-insensitively', () => {
  expect(isImagePath('/a/b.PNG')).toBe(true)
  expect(isImagePath('/a/b.jpeg')).toBe(true)
  expect(isImagePath('/a/b.md')).toBe(false)
  expect(baseName('/a/b/c.txt')).toBe('c.txt')
})
