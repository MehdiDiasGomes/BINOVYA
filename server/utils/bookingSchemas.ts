import { z } from 'zod'

import { ADDRESS_TOKEN_MAX_LENGTH } from './addressToken'

import { contactSchema, honeypotSchema, localeSchema } from '@/utils/bookingValidation'
import { isoDateSchema } from '@/utils/dateValidation'

const latitude = z.coerce.number().min(-90).max(90)
const longitude = z.coerce.number().min(-180).max(180)
const dayStatus = z.enum(['available', 'full', 'closed', 'outOfSector'])
export const binCountSchema = z.number().int().min(0).max(10)

export const weekdaysSchema = z.array(z.number().int().min(0).max(6)).max(7)

const POSTCODE_PATTERNS: Record<'FR' | 'LU', RegExp> = { FR: /^\d{5}$/, LU: /^\d{4}$/ }

const addressFieldsSchema = z.object({
  label: z.string().trim().min(3).max(300),
  city: z.string().trim().min(1).max(120),
  postcode: z.string().trim(),
  countryCode: z.enum(['FR', 'LU']),
  latitude,
  longitude,
})

const hasCountryPostcode = (address: z.infer<typeof addressFieldsSchema>): boolean =>
  POSTCODE_PATTERNS[address.countryCode].test(address.postcode)

export const addressDetailsSchema = addressFieldsSchema.refine(hasCountryPostcode, {
  path: ['postcode'],
})

const hasMunicipalityPostcode = (municipality: z.infer<typeof addressFieldsSchema>): boolean =>
  municipality.postcode === ''
    ? municipality.countryCode === 'LU'
    : hasCountryPostcode(municipality)

const signedFieldsSchema = addressFieldsSchema.extend({
  token: z.string().max(ADDRESS_TOKEN_MAX_LENGTH).default(''),
})

export const signedAddressSchema = signedFieldsSchema.refine(hasCountryPostcode, {
  path: ['postcode'],
})

export const municipalityDetailsSchema = addressFieldsSchema.refine(hasMunicipalityPostcode, {
  path: ['postcode'],
})

export const signedMunicipalitySchema = signedFieldsSchema.refine(hasMunicipalityPostcode, {
  path: ['postcode'],
})

export const bookingPlanSchema = z.enum(['one_off', 'quarterly', 'annual'])

export const bookingRequestSchema = z.object({
  address: signedAddressSchema,
  plan: bookingPlanSchema,
  smallBinCount: binCountSchema,
  largeBinCount: binCountSchema,
  householdCollectionWeekdays: weekdaysSchema,
  recyclingCollectionWeekdays: weekdaysSchema,
  binsReadyConfirmed: z.literal(true),
  date: isoDateSchema,
  contact: contactSchema,
  locale: localeSchema,
  website: honeypotSchema,
})

export const bookingReleaseSchema = z.object({ bookingId: z.string().uuid() })

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
