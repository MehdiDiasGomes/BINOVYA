import { z } from 'zod'

import { signedMunicipalitySchema } from './bookingSchemas'

import {
  PRO_AVAILABILITY_HORIZON_DAYS,
  PRO_INTERVENTIONS_MAX_PAGE,
  PRO_STATUS_FILTERS,
} from '@/constants/pro'
import { addDaysToIsoDate, businessToday } from '@/utils/date'
import { isIsoDate, isoDateSchema } from '@/utils/dateValidation'
import { dayCapacitySchema, dayNoteSchema, weekdaySchema } from '@/utils/proAvailabilityValidation'

const TOO_FAR_ISSUE_CODE: string = 'tooFar'

const isWithinProHorizon = (date: string): boolean =>
  !isIsoDate(date) || date <= addDaysToIsoDate(businessToday(), PRO_AVAILABILITY_HORIZON_DAYS)

const proHorizonDateSchema = isoDateSchema.refine(isWithinProHorizon, {
  params: { code: TOO_FAR_ISSUE_CODE },
})

/**
 * Tells whether a validation failed because a date lies beyond the BINOVYA Pro horizon (today in
 * Paris plus 365 days), the same bound as `admin_reschedule_booking`.
 * @param error - Error of a failed `safeParse`
 * @returns True when one issue is the horizon check
 */
export const isBeyondProHorizon = (error: z.ZodError): boolean =>
  error.issues.some(issue => issue.code === 'custom' && issue.params?.code === TOO_FAR_ISSUE_CODE)

export const proPlanningQuerySchema = z.object({ date: isoDateSchema.optional() })

export const proInterventionsQuerySchema = z
  .object({
    status: z.enum(PRO_STATUS_FILTERS).default('all'),
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    page: z.coerce.number().int().min(1).max(PRO_INTERVENTIONS_MAX_PAGE).default(1),
  })
  .refine(query => !query.from || !query.to || query.from <= query.to, { path: ['to'] })

export const proAvailabilityQuerySchema = z
  .object({ from: isoDateSchema.optional(), to: isoDateSchema.optional() })
  .refine(query => !query.from || !query.to || query.from <= query.to, { path: ['to'] })

export const proDateParamsSchema = z.object({ date: proHorizonDateSchema })

export const proBookingParamsSchema = z.object({ id: z.string().uuid() })

export const proWeekdayRulesSchema = z.object({
  rules: z
    .array(z.object({ weekday: weekdaySchema, maxBookings: dayCapacitySchema }))
    .min(1)
    .max(7)
    .refine(rules => new Set(rules.map(rule => rule.weekday)).size === rules.length),
})

export const proDayOverrideSchema = z.object({
  maxBookings: dayCapacitySchema.nullable(),
  note: dayNoteSchema.nullable().transform(note => (note ? note : null)),
  sector: signedMunicipalitySchema.nullable().optional(),
})

export const proRescheduleSchema = z.object({
  date: proHorizonDateSchema,
  force: z.boolean().default(false),
})
