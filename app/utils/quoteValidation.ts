import { z } from 'zod'

import type { QuoteErrors, QuoteForm, QuotePayload } from '@/types/quote'

import { COMPANY_MAX_LENGTH } from '@/constants/booking'
import { QUOTE_COMMENT_MAX_LENGTH, QUOTE_EQUIPMENT, QUOTE_MAX_BIN_COUNT } from '@/constants/quote'
import { contactSchema, validateContact } from '@/utils/bookingValidation'
import { toInternationalPhone } from '@/utils/phone'

export const quoteContactSchema = contactSchema.extend({
  company: z.string().trim().max(COMPANY_MAX_LENGTH).optional(),
})

export const quoteBinCountSchema = z.number().int().min(0).max(QUOTE_MAX_BIN_COUNT)

export const quoteCommentSchema = z.string().trim().max(QUOTE_COMMENT_MAX_LENGTH)

export const quoteEquipmentSchema = z
  .array(z.enum(QUOTE_EQUIPMENT))
  .min(1)
  .max(QUOTE_EQUIPMENT.length)
  .refine(list => new Set(list).size === list.length)

/**
 * Tells whether a quote request has bin counts consistent with its equipment: at least one bin
 * when bins are requested, none otherwise.
 * @param quote - Equipment and bin counts of the request
 * @returns True when the counts match the equipment
 */
export const hasConsistentBins = (
  quote: Pick<QuoteForm, 'equipment' | 'smallBinCount' | 'largeBinCount'>,
): boolean => {
  const total: number = quote.smallBinCount + quote.largeBinCount
  return quote.equipment.includes('bins') ? total > 0 : total === 0
}

/**
 * Tells whether the optional company name of a quote fits the length allowed by the server.
 * @param company - Company name typed by the customer
 * @returns True when the name is accepted
 */
export const isValidQuoteCompany = (company: string): boolean =>
  quoteContactSchema.shape.company.safeParse(company).success

/**
 * Validates the quote form before it is sent.
 * @param form - Quote form state
 * @returns Translation key of the error for each invalid section, empty when valid
 */
export const validateQuote = (form: QuoteForm): QuoteErrors => {
  const errors: QuoteErrors = {}
  const hasContactError: boolean = Object.keys(validateContact(form.contact)).length > 0
  if (hasContactError || !isValidQuoteCompany(form.contact.company)) {
    errors.contact = 'quote.errors.contact'
  }
  if (!form.address) {
    errors.address = 'quote.errors.address'
  }
  if (form.equipment.length === 0) {
    errors.equipment = 'quote.errors.equipment'
  } else if (form.equipment.includes('bins') && form.smallBinCount + form.largeBinCount === 0) {
    errors.bins = 'quote.errors.bins'
  }
  return errors
}

/**
 * Builds the contact sent to the server, with the phone number in international form.
 * @param form - Quote form state
 * @returns Contact without the phone country picker value
 */
export const toQuoteContactPayload = (form: QuoteForm): QuotePayload['contact'] => ({
  firstName: form.contact.firstName,
  lastName: form.contact.lastName,
  email: form.contact.email,
  phone: toInternationalPhone(form.contact.phone, form.contact.phoneCountryCode),
  company: form.contact.company,
})
