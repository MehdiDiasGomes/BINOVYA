import type { BookingPlan, PriceGridState } from '@/types/booking'

type BookingPrice = {
  isGridReady: ComputedRef<boolean>
  hasGridError: ComputedRef<boolean>
  priceFor: (plan: BookingPlan) => number | null
  priceCents: ComputedRef<number | null>
  isQuoteRequired: ComputedRef<boolean>
}

/**
 * Prices the booking being composed from the price grid stored in the database.
 * @returns Grid loading state, price per plan, current price and whether a quote is required
 */
export const useBookingPrice = (): BookingPrice => {
  const { draft, totalQuantity } = useBookingDraft()
  const { grid, isGridReady, hasGridError }: PriceGridState = usePriceGrid()

  const priceFor = (plan: BookingPlan): number | null =>
    findPriceCents(grid.value, plan, {
      small: draft.value.quantities['small-bin'],
      large: draft.value.quantities['large-bin'],
    })

  const priceCents: ComputedRef<number | null> = computed(() => priceFor(draft.value.plan))

  const isQuoteRequired: ComputedRef<boolean> = computed(
    () => isGridReady.value && totalQuantity.value > 0 && priceCents.value === null,
  )

  return { isGridReady, hasGridError, priceFor, priceCents, isQuoteRequired }
}
