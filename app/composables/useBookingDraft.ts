import type { BookingDraft } from '@/types/booking'

type BookingDraftState = {
  draft: Ref<BookingDraft>
  totalQuantity: ComputedRef<number>
  collectionWeekdays: ComputedRef<number[]>
  resetDraft: () => void
}

const createEmptyDraft = (): BookingDraft => ({
  address: null,
  quantities: { 'small-bin': 0, 'large-bin': 0 },
  plan: 'one_off',
  collection: {
    household: { weekdays: [], isUnknown: false },
    recycling: { weekdays: [], isUnknown: false },
  },
  date: null,
  contact: { firstName: '', lastName: '', email: '', phone: '' },
  hasConfirmedBinsReady: false,
  hasAcceptedTerms: false,
})

/**
 * Shares the booking being composed across the steps of the booking flow.
 * @returns Draft state, derived values and a reset helper
 */
export const useBookingDraft = (): BookingDraftState => {
  const draft: Ref<BookingDraft> = useState<BookingDraft>('booking-draft', createEmptyDraft)

  const totalQuantity: ComputedRef<number> = computed(
    () => draft.value.quantities['small-bin'] + draft.value.quantities['large-bin'],
  )

  const collectionWeekdays: ComputedRef<number[]> = computed(() => [
    ...new Set([
      ...draft.value.collection.household.weekdays,
      ...draft.value.collection.recycling.weekdays,
    ]),
  ])

  const resetDraft = (): void => {
    draft.value = createEmptyDraft()
  }

  return { draft, totalQuantity, collectionWeekdays, resetDraft }
}
