import { z } from 'zod'

import type { QuoteErrors, QuoteForm } from '@/types/quote'

import { QUOTE_COMMENT_MAX_LENGTH, QUOTE_MAX_BIN_COUNT } from '@/constants/quote'
import { contactSchema, validateContact } from '@/utils/bookingValidation'
import { toInternationalPhone } from '@/utils/phone'

export const quoteContactSchema = contactSchema.extend({
  company: z.string().trim().max(120).optional(),
})

export const quoteBinCountSchema = z.number().int().min(0).max(QUOTE_MAX_BIN_COUNT)

export const quoteCommentSchema = z.string().trim().max(QUOTE_COMMENT_MAX_LENGTH)

/**
 * Validates the quote form before it is sent.
 * @param form - Quote form state
 * @returns Translation key of the error for each invalid section, empty when valid
 */
export const validateQuote = (form: QuoteForm): QuoteErrors => {
  const errors: QuoteErrors = {}
  if (Object.keys(validateContact(form.contact)).length > 0) {
    errors.contact = 'quote.errors.contact'
  }
  if (!form.address) {
    errors.address = 'quote.errors.address'
  }
  if (form.smallBinCount + form.largeBinCount === 0) {
    errors.bins = 'quote.errors.bins'
  }
  return errors
}

/**
 * Builds the contact sent to the server, with the phone number in international form.
 * @param form - Quote form state
 * @returns Contact without the phone country picker value
 */
export const toQuoteContactPayload = (
  form: QuoteForm,
): { firstName: string; lastName: string; email: string; phone: string; company: string } => ({
  firstName: form.contact.firstName,
  lastName: form.contact.lastName,
  email: form.contact.email,
  phone: toInternationalPhone(form.contact.phone, form.contact.phoneCountryCode),
  company: form.contact.company,
})
