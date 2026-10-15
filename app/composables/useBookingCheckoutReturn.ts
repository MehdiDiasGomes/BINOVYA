import type { CheckoutOutcome, CheckoutReturnOptions, StoredCheckout } from '@/types/booking'

/**
 * Restores the booking page after Stripe Checkout: shows the confirmation on success, and on
 * cancellation, back navigation or reload restores the draft and releases the held slot.
 * @param options - Checkout helpers, page state and the step navigation of the booking page
 */
export const useBookingCheckoutReturn = (options: CheckoutReturnOptions): void => {
  const { checkout, isSubmitting, isConfirmed, submitErrorKey, showStep } = options
  const { draft } = useBookingDraft()

  const handleCheckoutReturn = async (outcome: CheckoutOutcome | null): Promise<void> => {
    const stored: StoredCheckout | null = checkout.takeCheckout()
    if (!outcome && !stored) {
      return
    }
    if (stored) {
      draft.value = stored.draft
    }
    if (outcome === 'success') {
      isConfirmed.value = true
    } else {
      submitErrorKey.value = outcome === 'cancelled' ? 'booking.errors.paymentCancelled' : null
      await showStep(stored ? 'payment' : 'contact')
      if (stored) {
        checkout.releaseBooking(stored.bookingId).catch(() => undefined)
      }
    }
    if (outcome) {
      await navigateTo({ query: {} }, { replace: true })
    }
  }

  const handlePageShow = (event: PageTransitionEvent): void => {
    if (!event.persisted || !isSubmitting.value) {
      return
    }
    isSubmitting.value = false
    handleCheckoutReturn('cancelled').catch(() => undefined)
  }

  onMounted(async () => {
    window.addEventListener('pageshow', handlePageShow)
    await handleCheckoutReturn(checkout.readOutcome())
  })

  onBeforeUnmount(() => {
    window.removeEventListener('pageshow', handlePageShow)
  })
}
