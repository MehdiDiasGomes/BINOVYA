import type { BookingResponse } from '@/types/booking'

import { serverSupabaseServiceRole } from '#supabase/server'

const STATUS_BY_ERROR: Record<string, number> = {
  DAY_UNAVAILABLE: 409,
  OUT_OF_AREA: 422,
}

export default defineEventHandler(async (event): Promise<BookingResponse> => {
  const body = await readValidatedBody(event, bookingRequestSchema.parse)
  const client = serverSupabaseServiceRole(event)
  const customerId: string = await findOrCreateCustomer(client, body.contact)

  const { data, error } = await client.rpc('create_booking', {
    p_customer_id: customerId,
    p_scheduled_date: body.date,
    p_address: body.address.label,
    p_city: body.address.city,
    p_postcode: body.address.postcode,
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
    throw createError({
      statusCode: STATUS_BY_ERROR[error.message] ?? 400,
      statusMessage: error.message,
    })
  }

  const [created] = createdBookingSchema.parse(data)
  if (!created) {
    throw createError({ statusCode: 500, statusMessage: 'Booking creation failed' })
  }

  return { bookingId: created.new_booking_id, amountTotalCents: created.total_cents }
})
