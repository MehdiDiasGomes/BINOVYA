import type { BookingErrorCode, BookingResponse } from '@/types/booking'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Error } from 'h3'
import type Stripe from 'stripe'

import { serverSupabaseServiceRole } from '#supabase/server'

type BookingRejection = {
  statusCode: number
  statusMessage: string
  code: BookingErrorCode
}

const REJECTIONS: Map<string, BookingRejection> = new Map([
  ['DAY_UNAVAILABLE', { statusCode: 409, statusMessage: 'Day unavailable', code: 'dayTaken' }],
  [
    'PENDING_BOOKING_EXISTS',
    { statusCode: 409, statusMessage: 'Payment already pending', code: 'pendingPayment' },
  ],
  ['OUT_OF_AREA', { statusCode: 422, statusMessage: 'Address out of area', code: 'outOfArea' }],
  ['QUOTE_REQUIRED', { statusCode: 422, statusMessage: 'Quote required', code: 'quoteRequired' }],
  [
    'BINS_NOT_CONFIRMED',
    { statusCode: 422, statusMessage: 'Bins not confirmed', code: 'binsNotConfirmed' },
  ],
])

const bookingRejection = (message: string): H3Error => {
  const rejection: BookingRejection | undefined = REJECTIONS.get(message)
  if (!rejection) {
    console.error('Booking creation rejected', message)
    return createError({ statusCode: 400, statusMessage: 'Booking rejected' })
  }
  return createError({
    statusCode: rejection.statusCode,
    statusMessage: rejection.statusMessage,
    data: { code: rejection.code },
  })
}

const MAX_BODY_BYTES = 16 * 1024

const attachCheckout = async (
  client: SupabaseClient<Database>,
  checkout: BookingCheckoutInput,
): Promise<string> => {
  const { bookingId } = checkout
  const session: Stripe.Checkout.Session = await createBookingCheckout(checkout).catch(async () => {
    await expireUnpaidBooking(client, bookingId)
    throw createError({ statusCode: 502, statusMessage: 'Checkout creation failed' })
  })

  const { error } = await client
    .from('bookings')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', bookingId)
  if (error || !session.url) {
    await useStripe()
      .checkout.sessions.expire(session.id)
      .catch(() => null)
    await expireUnpaidBooking(client, bookingId)
    throw createError({ statusCode: 500, statusMessage: 'Checkout attachment failed' })
  }

  return session.url
}

export default defineEventHandler(async (event): Promise<BookingResponse> => {
  assertBodySize(event, MAX_BODY_BYTES)
  const body = await readValidatedBody(event, bookingRequestSchema.parse)
  assertCheckoutSiteUrl()
  if (body.website) {
    return {
      bookingId: crypto.randomUUID(),
      amountTotalCents: 0,
      checkoutUrl: bookingPageUrl(body.locale, 'cancelled'),
    }
  }

  requireSignedAddress(body.address)

  const client = serverSupabaseServiceRole<Database>(event)
  const customerId: string = await findOrCreateCustomer(client, body.contact)

  const { data, error } = await client.rpc('create_booking', {
    p_customer_id: customerId,
    p_scheduled_date: body.date,
    p_address: body.address.label,
    p_city: body.address.city,
    p_postcode: body.address.postcode,
    p_country_code: body.address.countryCode,
    p_latitude: body.address.latitude,
    p_longitude: body.address.longitude,
    p_plan: body.plan,
    p_small_bin_count: body.smallBinCount,
    p_large_bin_count: body.largeBinCount,
    p_household_collection_weekdays: body.householdCollectionWeekdays,
    p_recycling_collection_weekdays: body.recyclingCollectionWeekdays,
    p_bins_ready_confirmed: body.binsReadyConfirmed,
  })
  if (error) {
    throw bookingRejection(error.message)
  }

  const [created] = createdBookingSchema.parse(data)
  if (!created) {
    throw createError({ statusCode: 500, statusMessage: 'Booking creation failed' })
  }

  const checkoutUrl: string = await attachCheckout(client, {
    bookingId: created.new_booking_id,
    amountCents: created.total_cents,
    plan: body.plan,
    scheduledDate: body.date,
    billing: {
      firstName: body.contact.firstName,
      lastName: body.contact.lastName,
      email: body.contact.email.trim().toLowerCase(),
      address: body.address,
    },
    locale: body.locale,
  })

  return {
    bookingId: created.new_booking_id,
    amountTotalCents: created.total_cents,
    checkoutUrl,
  }
})
