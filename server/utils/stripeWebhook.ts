import Stripe from 'stripe'

import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

const paymentIntentId = (session: Stripe.Checkout.Session): string | null =>
  typeof session.payment_intent === 'string'
    ? session.payment_intent
    : (session.payment_intent?.id ?? null)

const isAlreadyRefunded = (error: unknown): boolean =>
  error instanceof Stripe.errors.StripeError && error.code === 'charge_already_refunded'

const refundBookingPayment = async (bookingId: string, paymentIntent: string): Promise<boolean> =>
  useStripe()
    .refunds.create(
      { payment_intent: paymentIntent },
      { idempotencyKey: `booking-refund-${bookingId}` },
    )
    .then(() => true)
    .catch((error: unknown) => {
      if (isAlreadyRefunded(error)) {
        return false
      }
      console.error(`Refund failed for booking ${bookingId}`)
      throw createError({ statusCode: 500, statusMessage: 'Refund failed' })
    })

const refundAndNotify = async (
  client: SupabaseClient<Database>,
  bookingId: string,
  paymentIntent: string,
): Promise<void> => {
  const isNewRefund: boolean = await refundBookingPayment(bookingId, paymentIntent)
  if (isNewRefund) {
    await sendBookingRefundEmail(client, bookingId)
  }
}

const cancelExpiredBooking = async (
  client: SupabaseClient<Database>,
  bookingId: string,
): Promise<void> => {
  const { error } = await client
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
    .eq('status', 'expired')
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Booking cancellation failed' })
  }
}

const confirmBookingPayment = async (
  client: SupabaseClient<Database>,
  session: Stripe.Checkout.Session,
): Promise<void> => {
  const bookingId: string | null = session.client_reference_id
  const paymentIntent: string | null = paymentIntentId(session)
  if (session.payment_status !== 'paid' || !bookingId) {
    return
  }
  if (session.currency !== 'eur' || session.amount_total === null || !paymentIntent) {
    console.error(`Stripe session ${session.id} has an unexpected currency, amount or intent`)
    return
  }

  const { data: result, error } = await client.rpc('confirm_booking_payment', {
    p_booking_id: bookingId,
    p_checkout_session_id: session.id,
    p_payment_intent_id: paymentIntent,
    p_amount_cents: session.amount_total,
  })
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Booking payment update failed' })
  }

  if (result === 'paid') {
    await sendBookingPaidEmails(client, bookingId)
  } else if (result === 'not_found') {
    console.error(`Stripe session ${session.id} matched no booking`)
  } else if (result === 'refund_required') {
    await cancelExpiredBooking(client, bookingId)
    await refundAndNotify(client, bookingId, paymentIntent)
  } else if (result === 'not_payable') {
    console.error(`Stripe session ${session.id} paid a cancelled booking, refunding`)
    await refundAndNotify(client, bookingId, paymentIntent)
  }
}

const markBookingExpired = async (
  client: SupabaseClient<Database>,
  session: Stripe.Checkout.Session,
): Promise<void> => {
  const { error } = await client
    .from('bookings')
    .update({ status: 'expired' })
    .eq('stripe_checkout_session_id', session.id)
    .eq('status', 'pending_payment')
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Booking expiry update failed' })
  }
}

/**
 * Applies a verified Stripe event to the matching booking. Each update is conditioned on the
 * current status and each refund carries an idempotency key, so a redelivered event changes
 * nothing; a payment already refunded once is not refunded nor notified again. A payment that can
 * no longer hold its slot is refunded. Booking emails are sent after the database update and
 * never make the webhook fail.
 * @param client - Supabase client using the secret key
 * @param stripeEvent - Event whose signature was already verified
 */
export const handleStripeEvent = async (
  client: SupabaseClient<Database>,
  stripeEvent: Stripe.Event,
): Promise<void> => {
  if (stripeEvent.type === 'checkout.session.completed') {
    await confirmBookingPayment(client, stripeEvent.data.object)
  } else if (stripeEvent.type === 'checkout.session.expired') {
    await markBookingExpired(client, stripeEvent.data.object)
  }
}
