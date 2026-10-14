import { z } from 'zod'

import { contactSchema } from '@/utils/bookingValidation'

const latitude = z.coerce.number().min(-90).max(90)
const longitude = z.coerce.number().min(-180).max(180)
const dayStatus = z.enum(['available', 'full', 'closed', 'outOfSector'])
const binCount = z.number().int().min(0).max(10)
const weekdays = z.array(z.number().int().min(0).max(6)).max(7)

export const coordinatesSchema = z.object({ latitude, longitude })

export const bookingRequestSchema = z.object({
  address: z.object({
    label: z.string().trim().min(3).max(300),
    city: z.string().trim().min(1).max(120),
    postcode: z
      .string()
      .trim()
      .regex(/^\d{5}$/),
    latitude,
    longitude,
  }),
  plan: z.enum(['one_off', 'quarterly', 'annual']),
  smallBinCount: binCount,
  largeBinCount: binCount,
  householdCollectionWeekdays: weekdays,
  recyclingCollectionWeekdays: weekdays,
  binsReadyConfirmed: z.literal(true),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contact: contactSchema,
})

export const bookingSettingsSchema = z.object({
  depot_latitude: z.number(),
  depot_longitude: z.number(),
  service_area_radius_km: z.number(),
})

export const availabilityRowsSchema = z.array(z.object({ day: z.string(), status: dayStatus }))

export const createdBookingSchema = z
  .array(z.object({ new_booking_id: z.string().uuid(), total_cents: z.number().int() }))
  .length(1)

export const profileIdSchema = z.object({ id: z.string().uuid() })
