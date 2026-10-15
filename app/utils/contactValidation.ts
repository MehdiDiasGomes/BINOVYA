import { z } from 'zod'

import type { ContactField, ContactForm, ContactFormErrors, ContactPayload } from '@/types/contact'

import { COMPANY_MAX_LENGTH } from '@/constants/booking'
import {
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_MESSAGE_MIN_LENGTH,
  CONTACT_SUBJECTS,
} from '@/constants/contact'
import { contactSchema, honeypotSchema } from '@/utils/bookingValidation'
import { toInternationalPhone } from '@/utils/phone'

export const contactRequestSchema = contactSchema.extend({
  company: z.string().trim().max(COMPANY_MAX_LENGTH),
  subject: z.enum(CONTACT_SUBJECTS),
  message: z.string().trim().min(CONTACT_MESSAGE_MIN_LENGTH).max(CONTACT_MESSAGE_MAX_LENGTH),
  website: honeypotSchema,
})

/**
 * Builds the body sent to the contact endpoint, with the phone number in international form.
 * @param form - Contact form state
 * @returns Payload validated by the server
 */
export const toContactPayload = (form: ContactForm): ContactPayload => ({
  firstName: form.firstName,
  lastName: form.lastName,
  company: form.company,
  email: form.email,
  phone: toInternationalPhone(form.phone, form.phoneCountryCode),
  subject: form.subject,
  message: form.message,
  website: form.website,
})

/**
 * Validates the contact form before it is sent.
 * @param form - Contact form state
 * @returns Translation key of the error for each invalid field, empty when valid
 */
export const validateContactForm = (form: ContactForm): ContactFormErrors => {
  const result = contactRequestSchema.safeParse(toContactPayload(form))
  if (result.success) {
    return {}
  }

  const errors: ContactFormErrors = {}
  result.error.issues.forEach(issue => {
    const field = issue.path[0] as ContactField
    errors[field] ??= `contact.errors.${field}`
  })
  return errors
}
