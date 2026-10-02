export const BLUE = '#4f9cff'
export const YELLOW = '#f5c542'
export const RED = '#ef4f4f'

export const colorFor = (percent: number): string =>
  percent > 70 ? RED : percent > 30 ? YELLOW : BLUE
