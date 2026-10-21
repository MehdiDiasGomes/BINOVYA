import type { PriceGridEntry, PriceGridState } from '@/types/booking'
import type { Database } from '@/types/database.types'

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
 * Loads the price grid stored in the database once per page, shared by the online booking and
 * BINOVYA Pro.
 * @returns Grid entries and whether the grid is loaded or failed
 */
export const usePriceGrid = (): PriceGridState => {
  const { data, status } = useAsyncData<PriceGridEntry[]>('booking-price-grid', loadPriceGrid, {
    default: () => [],
  })

  const isGridReady: ComputedRef<boolean> = computed(() => status.value === 'success')
  const hasGridError: ComputedRef<boolean> = computed(() => status.value === 'error')

  return { grid: data, isGridReady, hasGridError }
}
