import { z } from 'zod'

import type { BookingContact, ContactErrors } from '@/types/booking'

const FRENCH_PHONE_PATTERN = /^(?:\+33|0033|0)[1-9]\d{8}$/
const LUXEMBOURG_PHONE_PATTERN = /^(?:\+352|00352)\d{6,9}$/

/**
 * Tells whether a phone number is a valid French or Luxembourgish number.
 * @param phone - Phone number as typed, separators allowed
 * @returns True when the number matches one of the two formats
 */
export const isValidPhone = (phone: string): boolean => {
  const compact: string = phone.replace(/[\s.()-]/g, '')
  return FRENCH_PHONE_PATTERN.test(compact) || LUXEMBOURG_PHONE_PATTERN.test(compact)
}

export const contactSchema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().refine(isValidPhone),
})

/**
 * Validates the contact details of a booking.
 * @param contact - Contact details typed by the customer
 * @returns Translation key of the error for each invalid field, empty when valid
 */
export const validateContact = (contact: BookingContact): ContactErrors => {
  const result = contactSchema.safeParse(contact)
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
