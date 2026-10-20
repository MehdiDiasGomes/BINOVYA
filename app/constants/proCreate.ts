import type {
  ProBookingMode,
  ProCreateErrorCode,
  ProCreateField,
  ProCreateSection,
  ProPaymentLinkErrorCode,
  ProPriceSource,
} from '@/types/proCreate'

import { PRO_RESCHEDULE_FORCEABLE_CODES } from '@/constants/pro'

export const PRO_CREATE_TIMEOUT_MS: number = 25000

export const PRO_PAYMENT_LINK_TIMEOUT_MS: number = 15000

export const PRO_MAX_BINS_PER_SERVICE: number = 2

export const PRO_QUOTE_MAX_BINS_PER_SERVICE: number = 50

export const PRO_QUOTE_MIN_CENTS: number = 1

export const PRO_QUOTE_MAX_CENTS: number = 1000000

export const PRO_ADMIN_NOTE_MAX_LENGTH: number = 500

export const PRO_PAYMENT_LINK_HOLD_MINUTES: number = 1435

export const PRO_PAYMENT_LINK_HOLD_HOURS: number = Math.round(PRO_PAYMENT_LINK_HOLD_MINUTES / 60)

export const PRO_CHECKOUT_EXPIRY_MARGIN_SECONDS: number = 60

export const PRO_RECREATE_QUERY: string = 'from'

export const PRO_BOOKING_MODES: [ProBookingMode, ...ProBookingMode[]] = ['payment_link', 'offline']

export const PRO_PRICE_SOURCES: [ProPriceSource, ...ProPriceSource[]] = ['grid', 'quote']

export const PRO_CREATE_ERROR_CODES: ProCreateErrorCode[] = [
  ...PRO_RESCHEDULE_FORCEABLE_CODES,
  'invalidInput',
  'invalidAddress',
  'invalidQuantities',
  'invalidQuoteAmount',
  'quoteRequired',
  'customerNotFound',
  'customerPending',
  'pastDate',
  'tooFar',
  'paymentLinkFailed',
]

export const PRO_PAYMENT_LINK_ERROR_CODES: ProPaymentLinkErrorCode[] = [
  'notFound',
  'notPending',
  'linkExpired',
  'noLink',
  'tooFrequent',
  'linkUnavailable',
  'emailFailed',
]

export const PRO_PAYMENT_LINK_OUTDATED_CODES: ProPaymentLinkErrorCode[] = [
  'notFound',
  'notPending',
  'linkExpired',
]

export const PRO_CREATED_NOTICE_KEY: string = 'pro-created-notice'

export const PRO_CREATE_ID_PREFIX: string = 'pro-create'

export const PRO_CREATE_SECTIONS: ProCreateSection[] = [
  'customer',
  'address',
  'bins',
  'date',
  'payment',
]

export const PRO_CREATE_FIELDS: ProCreateField[] = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'address',
  'quoteAmount',
  'bins',
  'date',
  'note',
]

export const PRO_CREATE_FIELD_IDS: Record<ProCreateField, string> = {
  firstName: `${PRO_CREATE_ID_PREFIX}-first-name`,
  lastName: `${PRO_CREATE_ID_PREFIX}-last-name`,
  email: `${PRO_CREATE_ID_PREFIX}-email`,
  phone: `${PRO_CREATE_ID_PREFIX}-phone`,
  address: `${PRO_CREATE_ID_PREFIX}-address`,
  quoteAmount: `${PRO_CREATE_ID_PREFIX}-quote-amount`,
  bins: `${PRO_CREATE_ID_PREFIX}-bins`,
  date: `${PRO_CREATE_ID_PREFIX}-date`,
  note: `${PRO_CREATE_ID_PREFIX}-note`,
}

export const PRO_PAYMENT_LINK_MAX_RESENDS: number = 3

export const PRO_RADIO_CARD_CLASS: string =
  'flex h-full min-h-14 flex-col rounded-xl border-2 border-ink/50 bg-white p-4 transition-[border-color,background-color,box-shadow,scale] duration-press ease-brand group-active:scale-[0.98] motion-reduce:transition-none motion-reduce:group-active:scale-100 peer-checked:border-primary peer-checked:bg-paper-2 peer-checked:shadow-sm peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 [@media(hover:hover)]:group-hover:border-primary'
