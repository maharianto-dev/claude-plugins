export const BLUE = '#4f9cff'
export const YELLOW = '#f5c542'
export const GREEN = '#4fc76b'
export const RED = '#ef4f4f'

// 'bad': a high percent is bad (used up). 'good': a high percent is good (cached, hit).
export type Direction = 'good' | 'bad'

export const meterColor = (percent: number, direction: Direction): string => {
  const [low, high] = direction === 'bad' ? [BLUE, RED] : [RED, BLUE]
  return percent > 70 ? high : percent > 30 ? YELLOW : low
}
