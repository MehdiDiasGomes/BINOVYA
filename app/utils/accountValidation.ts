import { z } from 'zod'

import { EMAIL_MAX_LENGTH } from '@/constants/booking'
import { honeypotSchema, localeSchema } from '@/utils/bookingValidation'

export const loginEmailSchema = z.string().trim().toLowerCase().email().max(EMAIL_MAX_LENGTH)

export const loginRequestSchema = z.object({
  email: loginEmailSchema,
  locale: localeSchema,
  website: honeypotSchema.default(''),
})

/**
 * Validates the email typed on the login page before it is sent.
 * @param email - Address typed by the customer
 * @returns Translation key of the error, or null when the address is valid
 */
export const validateLoginEmail = (email: string): string | null =>
  loginEmailSchema.safeParse(email).success ? null : 'account.login.errors.email'
