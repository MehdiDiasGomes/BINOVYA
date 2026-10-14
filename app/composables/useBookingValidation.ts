import type { BookingStepId } from '@/types/booking'

import { COLLECTION_KINDS } from '@/constants/booking'

type BookingValidation = {
  errorFor: (step: BookingStepId) => string | null
}

/**
 * Checks each step of the booking flow before moving to the next one.
 * @returns Translation key of the first blocking error of a step, or null when it is complete
 */
export const useBookingValidation = (): BookingValidation => {
  const { draft, totalQuantity } = useBookingDraft()
  const { state: availabilityState, isInServiceArea } = useBookingAvailability()
  const { priceCents, isQuoteRequired } = useBookingPrice()

  const contactError = (): string | null => {
    if (Object.keys(validateContact(draft.value.contact)).length > 0) {
      return 'booking.errors.contact'
    }
    if (!draft.value.address) {
      return 'booking.errors.address'
    }
    if (availabilityState.value !== 'ready') {
      return 'booking.errors.addressCheck'
    }
    return isInServiceArea.value ? null : 'booking.errors.outOfArea'
  }

  const binsError = (): string | null => {
    if (totalQuantity.value === 0) {
      return 'booking.errors.bins'
    }
    if (isQuoteRequired.value) {
      return 'booking.errors.quoteRequired'
    }
    const isCollectionAnswered: boolean = COLLECTION_KINDS.every(kind => {
      const answer = draft.value.collection[kind]
      return answer.weekdays.length > 0 || answer.isUnknown
    })
    return isCollectionAnswered ? null : 'booking.errors.collection'
  }

  const scheduleError = (): string | null => {
    if (priceCents.value === null) {
      return 'booking.errors.price'
    }
    return draft.value.date ? null : 'booking.errors.date'
  }

  const paymentError = (): string | null => {
    if (!draft.value.hasConfirmedBinsReady) {
      return 'booking.errors.binsReady'
    }
    return draft.value.hasAcceptedTerms ? null : 'booking.errors.terms'
  }

  const validators: Record<BookingStepId, () => string | null> = {
    contact: contactError,
    bins: binsError,
    schedule: scheduleError,
    payment: paymentError,
  }

  const errorFor = (step: BookingStepId): string | null => validators[step]()

  return { errorFor }
}
