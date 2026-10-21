import type {
  BinCounts,
  BookingPlan,
  GridPrice,
  GridPriceSource,
  PriceGridState,
} from '@/types/booking'

import { findPriceCents } from '@/utils/pricing'

/**
 * Prices a bin combination from the price grid stored in the database, shared by the online
 * booking and the BINOVYA Pro intervention form.
 * @param source - Getters of the bin counts and of the chosen plan
 * @returns Grid loading state, price per plan, current price and whether a quote is required
 */
export const useGridPrice = (source: GridPriceSource): GridPrice => {
  const { grid, isGridReady, hasGridError }: PriceGridState = usePriceGrid()

  const priceFor = (plan: BookingPlan): number | null =>
    findPriceCents(grid.value, plan, source.counts())

  const priceCents: ComputedRef<number | null> = computed(() => priceFor(source.plan()))

  const isQuoteRequired: ComputedRef<boolean> = computed(() => {
    const counts: BinCounts = source.counts()
    return isGridReady.value && counts.small + counts.large > 0 && priceCents.value === null
  })

  return { isGridReady, hasGridError, priceFor, priceCents, isQuoteRequired }
}
