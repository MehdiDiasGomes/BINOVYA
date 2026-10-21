import { z } from 'zod'

import {
  PRO_ADMIN_NOTE_MAX_LENGTH,
  PRO_QUOTE_MAX_BINS_PER_SERVICE,
  PRO_QUOTE_MAX_CENTS,
  PRO_QUOTE_MIN_CENTS,
} from '@/constants/proCreate'

const EURO_AMOUNT_PATTERN: RegExp = /^\d{1,7}(?:[.,]\d{1,2})?$/

const EURO_IGNORED_CHARACTERS: RegExp = /[\s€]/g

const CENTS_PER_EURO: number = 100

export const quoteAmountCentsSchema = z
  .number()
  .int()
  .min(PRO_QUOTE_MIN_CENTS)
  .max(PRO_QUOTE_MAX_CENTS)

export const adminNoteSchema = z.string().trim().max(PRO_ADMIN_NOTE_MAX_LENGTH)

export const proBinCountSchema = z.number().int().min(0).max(PRO_QUOTE_MAX_BINS_PER_SERVICE)

/**
 * Reads an amount in euros typed by the admin, such as « 120 », « 120,50 » or « 1 200 € ».
 * @param text - Amount as typed
 * @returns Amount in cents, or null when the text is not an amount
 */
export const parseEuroAmount = (text: string): number | null => {
  const compact: string = text.replace(EURO_IGNORED_CHARACTERS, '')
  if (!EURO_AMOUNT_PATTERN.test(compact)) {
    return null
  }
  return Math.round(Number(compact.replace(',', '.')) * CENTS_PER_EURO)
}

/**
 * Reads the quote price typed by the admin and checks it lies within the bounds of
 * `admin_create_booking` (1 cent to 10 000 euros).
 * @param text - Amount in euros as typed
 * @returns Amount in cents, or null when it is not a valid quote price
 */
export const parseQuoteAmountCents = (text: string): number | null => {
  const cents: number | null = parseEuroAmount(text)
  return cents !== null && quoteAmountCentsSchema.safeParse(cents).success ? cents : null
}

/**
 * Formats an amount in cents for the euro field of the Pro form, without currency sign.
 * @param cents - Amount in cents
 * @param locale - BCP 47 locale of the page
 * @returns Amount with two decimals, such as « 120,50 »
 */
export const formatEuroInput = (cents: number, locale: string): string =>
  new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(cents / CENTS_PER_EURO)
