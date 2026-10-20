import type { BinCounts, BookingPlan, PriceGridEntry } from '@/types/booking'

/**
 * Looks up the price of one visit for a plan and a bin combination.
 * @param grid - Price grid loaded from the database
 * @param plan - Chosen plan
 * @param counts - Number of small and large bins
 * @returns Price in cents, or null when the combination requires a quote
 */
export const findPriceCents = (
  grid: PriceGridEntry[],
  plan: BookingPlan,
  counts: BinCounts,
): number | null =>
  grid.find(
    entry =>
      entry.plan === plan &&
      entry.smallBinCount === counts.small &&
      entry.largeBinCount === counts.large,
  )?.priceCents ?? null

export const formatPrice = (cents: number, locale: string): string =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100)
