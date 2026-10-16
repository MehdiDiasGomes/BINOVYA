import type {
  AvailabilityResponse,
  BookingAddress,
  DayStatusEntry,
  GeoPoint,
} from '@/types/booking'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { z } from 'zod'

import { serverSupabaseServiceRole } from '#supabase/server'
import { distanceInKm } from '@/utils/geo'

const MAX_BODY_BYTES = 4 * 1024

export default defineEventHandler(async (event): Promise<AvailabilityResponse> => {
  assertBodySize(event, MAX_BODY_BYTES)
  const address: BookingAddress = await readValidatedBody(event, signedAddressSchema.parse)
  requireSignedAddress(address)
  const client: SupabaseClient<Database> = serverSupabaseServiceRole<Database>(event)

  const settingsResult = await client
    .from('booking_settings')
    .select('depot_latitude, depot_longitude, service_area_radius_km')
    .single()
  if (settingsResult.error) {
    throw createError({ statusCode: 500, statusMessage: 'Booking settings unavailable' })
  }

  const settings: z.infer<typeof bookingSettingsSchema> = bookingSettingsSchema.parse(
    settingsResult.data,
  )
  const depot: GeoPoint = { latitude: settings.depot_latitude, longitude: settings.depot_longitude }
  const serviceAreaRadiusKm: number = settings.service_area_radius_km

  if (distanceInKm(depot, address) > serviceAreaRadiusKm) {
    return { isInServiceArea: false, serviceAreaRadiusKm, days: [] }
  }

  const { data, error } = await client.rpc('get_availability', {
    p_latitude: address.latitude,
    p_longitude: address.longitude,
  })
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Availability unavailable' })
  }

  const days: DayStatusEntry[] = availabilityRowsSchema
    .parse(data)
    .map((row): DayStatusEntry => ({ date: row.day, status: row.status }))

  return { isInServiceArea: true, serviceAreaRadiusKm, days }
})
