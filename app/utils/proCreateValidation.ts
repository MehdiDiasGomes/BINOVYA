import { z } from 'zod'

import {
  CENTS_PER_EURO,
  PRO_ADMIN_NOTE_MAX_LENGTH,
  PRO_QUOTE_MAX_BINS_PER_SERVICE,
  PRO_QUOTE_MAX_CENTS,
  PRO_QUOTE_MIN_CENTS,
} from '@/constants/proCreate'

export const quoteAmountCentsSchema = z
  .number()
  .int()
  .min(PRO_QUOTE_MIN_CENTS)
  .max(PRO_QUOTE_MAX_CENTS)

export const adminNoteSchema = z.string().trim().max(PRO_ADMIN_NOTE_MAX_LENGTH)

export const proBinCountSchema = z.number().int().min(0).max(PRO_QUOTE_MAX_BINS_PER_SERVICE)

/**
 * Converts the quote price entered in euros and checks it lies within the bounds of
 * `admin_create_booking` (1 cent to 10 000 euros).
 * @param euros - Amount in euros, null when the field is empty
 * @returns Amount in cents, or null when it is not a valid quote price
 */
export const toQuoteAmountCents = (euros: number | null): number | null => {
  if (euros === null) {
    return null
  }
  const cents: number = Math.round(euros * CENTS_PER_EURO)
  return quoteAmountCentsSchema.safeParse(cents).success ? cents : null
}
