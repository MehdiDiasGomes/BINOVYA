import type { GridPrice } from '@/types/booking'

/**
 * Prices the booking being composed from the price grid stored in the database.
 * @returns Grid loading state, price per plan, current price and whether a quote is required
 */
export const useBookingPrice = (): GridPrice => {
  const { draft } = useBookingDraft()
  return useGridPrice({
    counts: () => ({
      small: draft.value.quantities['small-bin'],
      large: draft.value.quantities['large-bin'],
    }),
    plan: () => draft.value.plan,
  })
}
