import type {
  AvailabilityResponse,
  AvailabilityState,
  BookingAddress,
  DayAvailability,
} from '@/types/booking'

type BookingAvailability = {
  state: Ref<AvailabilityState>
  isInServiceArea: ComputedRef<boolean>
  serviceAreaRadiusKm: ComputedRef<number | null>
  days: ComputedRef<Map<string, DayAvailability>>
  nextAvailable: ComputedRef<DayAvailability | null>
  load: () => Promise<void>
  reset: () => void
}

/**
 * Loads from the server the days the customer can book from the address of the current draft.
 * @returns Request state, service area check, availability per ISO date and the loader
 */
export const useBookingAvailability = (): BookingAvailability => {
  const { draft } = useBookingDraft()
  const response: Ref<AvailabilityResponse | null> = useState<AvailabilityResponse | null>(
    'booking-availability',
    () => null,
  )
  const state: Ref<AvailabilityState> = useState<AvailabilityState>(
    'booking-availability-state',
    () => 'idle',
  )

  const reset = (): void => {
    response.value = null
    state.value = 'idle'
  }

  const load = async (): Promise<void> => {
    const address: BookingAddress | null = draft.value.address
    if (!address) {
      reset()
      return
    }

    state.value = 'loading'
    try {
      const result = await $fetch<AvailabilityResponse>('/api/booking/availability', {
        query: { latitude: address.latitude, longitude: address.longitude },
      })
      if (draft.value.address?.label === address.label) {
        response.value = result
        state.value = 'ready'
      }
    } catch {
      if (draft.value.address?.label === address.label) {
        state.value = 'error'
      }
    }
  }

  const isInServiceArea: ComputedRef<boolean> = computed(
    () => response.value?.isInServiceArea ?? false,
  )

  const serviceAreaRadiusKm: ComputedRef<number | null> = computed(
    () => response.value?.serviceAreaRadiusKm ?? null,
  )

  const days: ComputedRef<Map<string, DayAvailability>> = computed(() => {
    const { collectionWeekdays } = draft.value
    const entries = (response.value?.days ?? []).map((day): [string, DayAvailability] => [
      day.date,
      { ...day, isRecommended: isRecommendedDay(parseIsoDate(day.date), collectionWeekdays) },
    ])
    return new Map(entries)
  })

  const nextAvailable: ComputedRef<DayAvailability | null> = computed(() => {
    const available: DayAvailability[] = [...days.value.values()].filter(
      day => day.status === 'available',
    )
    return available.find(day => day.isRecommended) ?? available[0] ?? null
  })

  return { state, isInServiceArea, serviceAreaRadiusKm, days, nextAvailable, load, reset }
}
