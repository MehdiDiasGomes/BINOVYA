import { z } from 'zod'

import type { BookingContact, ContactErrors } from '@/types/booking'

const FRENCH_PHONE_PATTERN = /^(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}$/

export const contactSchema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().regex(FRENCH_PHONE_PATTERN),
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
