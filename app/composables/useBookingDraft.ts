import type { BookingDraft, BookingLine } from '@/types/booking'

import { BOOKING_SERVICES } from '@/constants/booking'

type BookingDraftState = {
  draft: Ref<BookingDraft>
  lines: ComputedRef<BookingLine[]>
  totalCents: ComputedRef<number>
  totalQuantity: ComputedRef<number>
  resetDraft: () => void
}

const createEmptyDraft = (): BookingDraft => ({
  address: null,
  quantities: { 'small-bin': 0, 'large-bin': 0 },
  plan: 'one_off',
  collectionWeekdays: [],
  recyclingCollectionWeekdays: [],
  isCollectionUnknown: false,
  date: null,
  contact: { firstName: '', lastName: '', email: '', phone: '' },
  hasConfirmedBinsReady: false,
  hasAcceptedTerms: false,
})

/**
 * Shares the booking being composed across the steps of the booking flow.
 * @returns Draft state, derived totals and a reset helper
 */
export const useBookingDraft = (): BookingDraftState => {
  const draft: Ref<BookingDraft> = useState<BookingDraft>('booking-draft', createEmptyDraft)

  const lines: ComputedRef<BookingLine[]> = computed(() =>
    BOOKING_SERVICES.map(service => {
      const quantity: number = draft.value.quantities[service.slug]
      return { service, quantity, totalCents: computeLineTotalCents(service, quantity) }
    }).filter(line => line.quantity > 0),
  )

  const totalCents: ComputedRef<number> = computed(() =>
    lines.value.reduce((sum, line) => sum + line.totalCents, 0),
  )

  const totalQuantity: ComputedRef<number> = computed(() =>
    lines.value.reduce((sum, line) => sum + line.quantity, 0),
  )

  const resetDraft = (): void => {
    draft.value = createEmptyDraft()
  }

  return { draft, lines, totalCents, totalQuantity, resetDraft }
}
