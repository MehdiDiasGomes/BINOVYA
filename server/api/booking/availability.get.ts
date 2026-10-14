import type { AvailabilityResponse } from '@/types/booking'

import { serverSupabaseServiceRole } from '#supabase/server'
import { distanceInKm } from '@/utils/geo'

export default defineEventHandler(async (event): Promise<AvailabilityResponse> => {
  const point = await getValidatedQuery(event, coordinatesSchema.parse)
  const client = serverSupabaseServiceRole(event)

  const settingsResult = await client
    .from('booking_settings')
    .select('depot_latitude, depot_longitude, service_area_radius_km')
    .single()
  if (settingsResult.error) {
    throw createError({ statusCode: 500, statusMessage: 'Booking settings unavailable' })
  }

  const settings = bookingSettingsSchema.parse(settingsResult.data)
  const depot = { latitude: settings.depot_latitude, longitude: settings.depot_longitude }
  const serviceAreaRadiusKm: number = settings.service_area_radius_km

  if (distanceInKm(depot, point) > serviceAreaRadiusKm) {
    return { isInServiceArea: false, serviceAreaRadiusKm, days: [] }
  }

  const { data, error } = await client.rpc('get_availability', {
    p_latitude: point.latitude,
    p_longitude: point.longitude,
  })
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Availability unavailable' })
  }

  const days = availabilityRowsSchema
    .parse(data)
    .map(row => ({ date: row.day, status: row.status }))

  return { isInServiceArea: true, serviceAreaRadiusKm, days }
})
