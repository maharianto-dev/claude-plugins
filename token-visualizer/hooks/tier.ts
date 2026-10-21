// How much of the band the desktop shows, picked from the cells across the band.
export type Tier = 'narrow' | 'medium' | 'wide'

export const MEDIUM_COLUMNS = 64
export const WIDE_COLUMNS = 104

export const tierOf = (columns: number): Tier =>
  columns >= WIDE_COLUMNS ? 'wide' : columns >= MEDIUM_COLUMNS ? 'medium' : 'narrow'

// Metric cards per row.
export const cardsPerRow = (tier: Tier): number => (tier === 'wide' ? 3 : tier === 'medium' ? 2 : 1)

// The detail (reset time, cache TTL) fits from medium up; the pace line needs the wide band.
export const showDetail = (tier: Tier): boolean => tier !== 'narrow'
export const showPace = (tier: Tier): boolean => tier === 'wide'
