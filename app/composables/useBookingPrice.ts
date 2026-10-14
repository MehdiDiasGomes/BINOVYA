import type { BookingPlan, PriceGridEntry } from '@/types/booking'
import type { Database } from '@/types/database.types'

type BookingPrice = {
  isGridReady: ComputedRef<boolean>
  hasGridError: ComputedRef<boolean>
  priceFor: (plan: BookingPlan) => number | null
  priceCents: ComputedRef<number | null>
  isQuoteRequired: ComputedRef<boolean>
}

const loadPriceGrid = async (): Promise<PriceGridEntry[]> => {
  const client = useSupabaseClient<Database>()
  const { data, error } = await client
    .from('price_grid')
    .select('plan, small_bin_count, large_bin_count, price_cents')
  if (error) {
    throw error
  }
  return data.map(row => ({
    plan: row.plan,
    smallBinCount: row.small_bin_count,
    largeBinCount: row.large_bin_count,
    priceCents: row.price_cents,
  }))
}

/**
 * Prices the booking being composed from the price grid stored in the database.
 * @returns Grid loading state, price per plan, current price and whether a quote is required
 */
export const useBookingPrice = (): BookingPrice => {
  const { draft, totalQuantity } = useBookingDraft()
  const { data, status } = useAsyncData<PriceGridEntry[]>('booking-price-grid', loadPriceGrid, {
    default: () => [],
  })

  const isGridReady: ComputedRef<boolean> = computed(() => status.value === 'success')
  const hasGridError: ComputedRef<boolean> = computed(() => status.value === 'error')

  const priceFor = (plan: BookingPlan): number | null =>
    findPriceCents(data.value, plan, {
      small: draft.value.quantities['small-bin'],
      large: draft.value.quantities['large-bin'],
    })

  const priceCents: ComputedRef<number | null> = computed(() => priceFor(draft.value.plan))

  const isQuoteRequired: ComputedRef<boolean> = computed(
    () => isGridReady.value && totalQuantity.value > 0 && priceCents.value === null,
  )

  return { isGridReady, hasGridError, priceFor, priceCents, isQuoteRequired }
}
