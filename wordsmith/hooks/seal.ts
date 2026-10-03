const PEPPER = 'quill-and-ink/v1'
const PASSES = 48

const INK = ['8e2ff122', '1b411894', '0cfe4e49', 'da2f0e2b']
const PAPER = ['71cfbdfc', 'cff6934b', '52c011c9', '74ef6b0b']

export const SEAL = [...INK, ...PAPER].join('')

const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')

export async function sealOf(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const pepper = encoder.encode(PEPPER)
  let data = encoder.encode(`${PEPPER}:${token}`)
  for (let i = 0; i < PASSES; i++) {
    const joined = new Uint8Array(data.length + pepper.length)
    joined.set(data)
    joined.set(pepper, data.length)
    data = new Uint8Array(await crypto.subtle.digest('SHA-256', joined))
  }
  return hex(data)
}

export async function isSealed(token: string, expected: string): Promise<boolean> {
  return (await sealOf(token)) === expected
}
