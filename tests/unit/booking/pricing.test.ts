import { describe, expect, it } from 'vitest'

import { findPriceCents, formatPrice } from '../../../app/utils/pricing'

import type { PriceGridEntry } from '../../../app/types/booking'

const grid: PriceGridEntry[] = [
  { plan: 'one_off', smallBinCount: 1, largeBinCount: 0, priceCents: 2500 },
  { plan: 'annual', smallBinCount: 1, largeBinCount: 0, priceCents: 1800 },
  { plan: 'one_off', smallBinCount: 0, largeBinCount: 0, priceCents: 0 },
]

describe('findPriceCents', () => {
  it('returns the price of the matching plan and bins', () => {
    expect(findPriceCents(grid, 'annual', { small: 1, large: 0 })).toBe(1800)
  })

  it('returns null when the combination requires a quote', () => {
    expect(findPriceCents(grid, 'one_off', { small: 10, large: 10 })).toBeNull()
  })

  it('returns null when the plan has no entry for the bins', () => {
    expect(findPriceCents(grid, 'quarterly', { small: 1, large: 0 })).toBeNull()
  })

  it('returns 0 rather than null for a free entry', () => {
    expect(findPriceCents(grid, 'one_off', { small: 0, large: 0 })).toBe(0)
  })
})

describe('formatPrice', () => {
  it('formats cents as euros in French', () => {
    expect(formatPrice(2550, 'fr')).toMatch(/^25,50\s€$/)
  })

  it('formats cents as euros in English', () => {
    expect(formatPrice(2550, 'en')).toBe('€25.50')
  })
})
