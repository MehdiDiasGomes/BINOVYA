import { z } from 'zod'

import type { BookingContact, ContactErrors } from '@/types/booking'

import {
  CONTACT_NAME_MAX_LENGTH,
  CONTACT_NAME_MIN_LENGTH,
  EMAIL_MAX_LENGTH,
  HONEYPOT_MAX_LENGTH,
} from '@/constants/booking'
import { isValidPhone, toInternationalPhone } from '@/utils/phone'

export const contactSchema = z.object({
  firstName: z.string().trim().min(CONTACT_NAME_MIN_LENGTH).max(CONTACT_NAME_MAX_LENGTH),
  lastName: z.string().trim().min(CONTACT_NAME_MIN_LENGTH).max(CONTACT_NAME_MAX_LENGTH),
  email: z.string().trim().email().max(EMAIL_MAX_LENGTH),
  phone: z.string().trim().refine(isValidPhone),
})

export const honeypotSchema = z.string().max(HONEYPOT_MAX_LENGTH)

export const localeSchema = z.enum(['fr', 'en']).default('fr')

/**
 * Validates the contact details of a booking.
 * @param contact - Contact details typed by the customer
 * @returns Translation key of the error for each invalid field, empty when valid
 */
export const validateContact = (contact: BookingContact): ContactErrors => {
  const result = contactSchema.safeParse({
    ...contact,
    phone: toInternationalPhone(contact.phone, contact.phoneCountryCode),
  })
  if (result.success) {
    return {}
  }

  const errors: ContactErrors = {}
  result.error.issues.forEach(issue => {
    const field = issue.path[0] as keyof BookingContact
    errors[field] ??= `booking.contact.errors.${field}`
  })
  return errors
}
