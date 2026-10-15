import { FetchError } from 'ofetch'

import type {
  BookingCheckoutState,
  BookingDraft,
  BookingErrorCode,
  CheckoutOutcome,
  StoredCheckout,
} from '@/types/booking'

import { BOOKING_SUBMIT_ERROR_KEYS } from '@/constants/booking'

const STORAGE_KEY = 'binovya-booking-checkout'

const isStoredCheckout = (value: unknown): value is StoredCheckout =>
  typeof value === 'object' &&
  value !== null &&
  'bookingId' in value &&
  typeof value.bookingId === 'string' &&
  'draft' in value &&
  typeof value.draft === 'object' &&
  value.draft !== null

const isBookingErrorCode = (value: unknown): value is BookingErrorCode =>
  typeof value === 'string' && Object.hasOwn(BOOKING_SUBMIT_ERROR_KEYS, value)

const readNested = (value: unknown, key: string): unknown =>
  typeof value === 'object' && value !== null && key in value
    ? (value as Record<string, unknown>)[key]
    : undefined

/**
 * Keeps the booking draft across the redirection to Stripe Checkout and back.
 * @returns Helpers to store the draft, read it back once, release an abandoned booking and read
 * the business error code of a rejected booking request
 */
export const useBookingCheckout = (): BookingCheckoutState => {
  const route = useRoute()
  let pendingRelease: Promise<void> = Promise.resolve()

  const rememberCheckout = (bookingId: string, draft: BookingDraft): boolean => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ bookingId, draft }))
      return true
    } catch {
      return false
    }
  }

  const takeCheckout = (): StoredCheckout | null => {
    try {
      const stored: string | null = sessionStorage.getItem(STORAGE_KEY)
      sessionStorage.removeItem(STORAGE_KEY)
      const parsed: unknown = stored ? JSON.parse(stored) : null
      return isStoredCheckout(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  const readOutcome = (): CheckoutOutcome | null => {
    const outcome: unknown = route.query.checkout
    return outcome === 'success' || outcome === 'cancelled' ? outcome : null
  }

  const releaseBooking = (bookingId: string): Promise<void> => {
    pendingRelease = $fetch('/api/booking/release', { method: 'POST', body: { bookingId } })
      .then(() => undefined)
      .catch(() => undefined)
    return pendingRelease
  }

  const waitForRelease = (): Promise<void> => pendingRelease

  const readErrorCode = (error: unknown): BookingErrorCode | null => {
    if (!(error instanceof FetchError)) {
      return null
    }
    const code: unknown = readNested(readNested(error.data, 'data'), 'code')
    return isBookingErrorCode(code) ? code : null
  }

  return {
    rememberCheckout,
    takeCheckout,
    readOutcome,
    releaseBooking,
    waitForRelease,
    readErrorCode,
  }
}
