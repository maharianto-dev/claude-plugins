// Green, blue, orange, yellow, red, purple.
export const PALETTE = ['#4fc76b', '#4f9cff', '#ff9f43', '#f5c542', '#ef4f4f', '#a77bf3'] as const

// `random` is a number in [0, 1), as Math.random gives.
export const pickColor = (random: number): string => PALETTE[Math.floor(random * PALETTE.length)]!
