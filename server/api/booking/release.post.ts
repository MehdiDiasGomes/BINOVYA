import type { BookingReleaseResponse } from '@/types/booking'
import type { Database } from '@/types/database.types'

import { serverSupabaseServiceRole } from '#supabase/server'

const MAX_BODY_BYTES = 1024

const isWithinHold = (expiresAt: string | null): boolean =>
  expiresAt !== null && Date.parse(expiresAt) > Date.now()

export default defineEventHandler(async (event): Promise<BookingReleaseResponse> => {
  assertBodySize(event, MAX_BODY_BYTES)
  const { bookingId } = await readValidatedBody(event, bookingReleaseSchema.parse)
  const client = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await client
    .from('bookings')
    .select('status, stripe_checkout_session_id, created_by_admin, expires_at')
    .eq('id', bookingId)
    .maybeSingle()
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Booking lookup failed' })
  }
  if (
    data?.status !== 'pending_payment' ||
    !data.stripe_checkout_session_id ||
    data.created_by_admin ||
    !isWithinHold(data.expires_at)
  ) {
    return { isReleased: false }
  }

  const isSessionExpired: boolean = await useStripe()
    .checkout.sessions.expire(data.stripe_checkout_session_id)
    .then(() => true)
    .catch(() => false)
  if (!isSessionExpired) {
    return { isReleased: false }
  }

  await expireUnpaidBooking(client, bookingId)
  return { isReleased: true }
})
