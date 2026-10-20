import type {
  ProCreateDraft,
  ProCreateErrorCode,
  ProCreateErrors,
  ProCreateRequest,
  ProPaymentLinkErrorCode,
} from '@/types/proCreate'

import { PRO_CREATE_ERROR_CODES, PRO_PAYMENT_LINK_ERROR_CODES } from '@/constants/proCreate'
import { validateContact } from '@/utils/bookingValidation'
import { toInternationalPhone } from '@/utils/phone'

/**
 * Builds an empty draft of the BINOVYA Pro intervention form.
 * @returns Draft with no customer, no address, no bin and the payment link mode
 */
export const emptyProCreateDraft = (): ProCreateDraft => ({
  contact: { firstName: '', lastName: '', email: '', phone: '', phoneCountryCode: 'FR' },
  address: null,
  plan: 'one_off',
  smallBinCount: 0,
  largeBinCount: 0,
  household: { weekdays: [], isUnknown: false },
  recycling: { weekdays: [], isUnknown: false },
  date: '',
  mode: 'payment_link',
})

/**
 * Checks the BINOVYA Pro intervention form: the customer as in the online booking, a chosen
 * address, at least one bin with a price in the grid, and a date.
 * @param draft - Form being filled
 * @param isQuoteRequired - Whether the grid has no price for the chosen bins
 * @returns Translation key of the error of each invalid field, empty when valid
 */
export const validateProCreateDraft = (
  draft: ProCreateDraft,
  isQuoteRequired: boolean,
): ProCreateErrors => {
  const errors: ProCreateErrors = { ...validateContact(draft.contact) }
  if (!draft.address) {
    errors.address = 'pro.create.errors.address'
  }
  if (draft.smallBinCount + draft.largeBinCount === 0) {
    errors.bins = 'pro.create.errors.bins'
  } else if (isQuoteRequired) {
    errors.bins = 'pro.create.errors.quoteRequired'
  }
  if (!draft.date) {
    errors.date = 'pro.create.errors.date'
  }
  return errors
}

/**
 * Builds the request creating the intervention, the phone in international format.
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
  return {
    contact: { ...contact, phone: toInternationalPhone(contact.phone, phoneCountryCode) },
    address: draft.address,
    plan: draft.plan,
    smallBinCount: draft.smallBinCount,
    largeBinCount: draft.largeBinCount,
    householdCollectionWeekdays: draft.household.weekdays,
    recyclingCollectionWeekdays: draft.recycling.weekdays,
    date: draft.date,
    mode: draft.mode,
    force,
  }
}

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
