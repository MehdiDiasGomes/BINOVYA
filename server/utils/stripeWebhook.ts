import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

const paymentIntentId = (session: Stripe.Checkout.Session): string | null =>
  typeof session.payment_intent === 'string'
    ? session.payment_intent
    : (session.payment_intent?.id ?? null)

const refundBookingPayment = async (bookingId: string, paymentIntent: string): Promise<void> => {
  await useStripe()
    .refunds.create(
      { payment_intent: paymentIntent },
      { idempotencyKey: `booking-refund-${bookingId}` },
    )
    .catch(() => {
      console.error(`Refund failed for booking ${bookingId}`)
      throw createError({ statusCode: 500, statusMessage: 'Refund failed' })
    })
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

  if (result === 'not_found') {
    console.error(`Stripe session ${session.id} matched no booking`)
  } else if (result === 'refund_required') {
    await cancelExpiredBooking(client, bookingId)
    await refundBookingPayment(bookingId, paymentIntent)
  } else if (result === 'not_payable') {
    console.error(`Stripe session ${session.id} paid a cancelled booking, refunding`)
    await refundBookingPayment(bookingId, paymentIntent)
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
 * nothing. A payment that can no longer hold its slot is refunded.
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
