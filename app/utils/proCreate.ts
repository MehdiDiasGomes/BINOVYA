import type { CollectionAnswer, NationalPhone } from '@/types/booking'
import type {
  ProCreateDraft,
  ProCreateErrorCode,
  ProCreateErrors,
  ProCreatePrefill,
  ProCreateRequest,
  ProPaymentLinkErrorCode,
} from '@/types/proCreate'

import {
  CENTS_PER_EURO,
  PRO_CHECKOUT_EXPIRY_MARGIN_SECONDS,
  PRO_CREATE_ERROR_CODES,
  PRO_PAYMENT_LINK_ERROR_CODES,
} from '@/constants/proCreate'
import { validateContact } from '@/utils/bookingValidation'
import { toInternationalPhone, toNationalPhone } from '@/utils/phone'
import { adminNoteSchema, toQuoteAmountCents } from '@/utils/proCreateValidation'

const MILLISECONDS_PER_SECOND: number = 1000

const collectionAnswer = (weekdays: number[]): CollectionAnswer => ({
  weekdays,
  isUnknown: weekdays.length === 0,
})

/**
 * Builds an empty draft of the BINOVYA Pro intervention form, with a new request id that makes
 * its submission idempotent.
 * @returns Draft with no customer, no address, no bin, the grid price and the payment link mode
 */
export const emptyProCreateDraft = (): ProCreateDraft => ({
  requestId: crypto.randomUUID(),
  contact: { firstName: '', lastName: '', email: '', phone: '', phoneCountryCode: 'FR' },
  address: null,
  plan: 'one_off',
  smallBinCount: 0,
  largeBinCount: 0,
  household: { weekdays: [], isUnknown: false },
  recycling: { weekdays: [], isUnknown: false },
  date: '',
  mode: 'payment_link',
  priceSource: 'grid',
  quoteAmount: null,
  note: '',
})

/**
 * Builds the draft recreating an intervention whose payment link expired: same customer,
 * address, bins, plan, collection days, price and note, a new request id and no date.
 * @param prefill - Intervention to recreate, address signed again by the server
 * @returns Draft to complete with a date
 */
export const prefilledProCreateDraft = (prefill: ProCreatePrefill): ProCreateDraft => {
  const phone: NationalPhone = toNationalPhone(prefill.contact.phone)
  return {
    ...emptyProCreateDraft(),
    contact: { ...prefill.contact, phone: phone.phone, phoneCountryCode: phone.countryCode },
    address: prefill.address,
    plan: prefill.plan,
    smallBinCount: prefill.smallBinCount,
    largeBinCount: prefill.largeBinCount,
    household: collectionAnswer(prefill.householdCollectionWeekdays),
    recycling: collectionAnswer(prefill.recyclingCollectionWeekdays),
    priceSource: prefill.quoteAmountCents === null ? 'grid' : 'quote',
    quoteAmount:
      prefill.quoteAmountCents === null ? null : prefill.quoteAmountCents / CENTS_PER_EURO,
    note: prefill.note ?? '',
  }
}

/**
 * Checks the BINOVYA Pro intervention form: the customer as in the online booking, a chosen
 * address, at least one bin, either priced by the grid or with a valid quote price, a date and a
 * note of 500 characters at most.
 * @param draft - Form being filled
 * @param isQuoteRequired - Whether the grid has no price for the chosen bins
 * @returns Translation key of the error of each invalid field, empty when valid
 */
export const validateProCreateDraft = (
  draft: ProCreateDraft,
  isQuoteRequired: boolean,
): ProCreateErrors => {
  const errors: ProCreateErrors = { ...validateContact(draft.contact) }
  const isQuote: boolean = draft.priceSource === 'quote'
  if (!draft.address) {
    errors.address = 'pro.create.errors.address'
  }
  if (isQuote && toQuoteAmountCents(draft.quoteAmount) === null) {
    errors.quoteAmount = 'pro.create.errors.quoteAmount'
  }
  if (draft.smallBinCount + draft.largeBinCount === 0) {
    errors.bins = 'pro.create.errors.bins'
  } else if (!isQuote && isQuoteRequired) {
    errors.bins = 'pro.create.errors.quoteRequired'
  }
  if (!draft.date) {
    errors.date = 'pro.create.errors.date'
  }
  if (!adminNoteSchema.safeParse(draft.note).success) {
    errors.note = 'pro.create.errors.note'
  }
  return errors
}

/**
 * Builds the request creating the intervention, the phone in international format and the quote
 * price in cents.
 * @param draft - Valid form
 * @param force - Whether to override the forceable refusals
 * @returns Request body, or null while the address or the date is missing
 */
export const toProCreateRequest = (
  draft: ProCreateDraft,
  force: boolean,
): ProCreateRequest | null => {
  if (!draft.address || !draft.date) {
    return null
  }
  const { phoneCountryCode, ...contact } = draft.contact
  const note: string = draft.note.trim()
  return {
    requestId: draft.requestId,
    contact: { ...contact, phone: toInternationalPhone(contact.phone, phoneCountryCode) },
    address: draft.address,
    plan: draft.plan,
    smallBinCount: draft.smallBinCount,
    largeBinCount: draft.largeBinCount,
    householdCollectionWeekdays: draft.household.weekdays,
    recyclingCollectionWeekdays: draft.recycling.weekdays,
    date: draft.date,
    mode: draft.mode,
    quoteAmountCents: draft.priceSource === 'quote' ? toQuoteAmountCents(draft.quoteAmount) : null,
    note: note.length > 0 ? note : null,
    force,
  }
}

/**
 * Gives the payment deadline announced for a payment link: the expiry of its Checkout session,
 * one minute before the end of the hold of the booking (1435 minutes, so always within the 24
 * hours Stripe allows).
 * @param holdExpiresAt - End of the hold of the booking, ISO timestamp
 * @returns Payment deadline, ISO timestamp
 */
export const paymentLinkDueAt = (holdExpiresAt: string): string =>
  new Date(
    Date.parse(holdExpiresAt) - PRO_CHECKOUT_EXPIRY_MARGIN_SECONDS * MILLISECONDS_PER_SECOND,
  ).toISOString()

/**
 * Tells whether a value is a known refusal code of the intervention creation.
 * @param code - `data.code` of the error
 * @returns True when the code has a message
 */
export const isProCreateErrorCode = (code: unknown): code is ProCreateErrorCode =>
  (PRO_CREATE_ERROR_CODES as unknown[]).includes(code)

/**
 * Tells whether a value is a known refusal code of the payment link resend.
 * @param code - `data.code` of the error
 * @returns True when the code has a message
 */
export const isProPaymentLinkErrorCode = (code: unknown): code is ProPaymentLinkErrorCode =>
  (PRO_PAYMENT_LINK_ERROR_CODES as unknown[]).includes(code)
