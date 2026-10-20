import type {
  ProBookingMode,
  ProCreateErrorCode,
  ProCreateField,
  ProCreateSection,
  ProPaymentLinkErrorCode,
} from '@/types/proCreate'

import { PRO_RESCHEDULE_FORCEABLE_CODES } from '@/constants/pro'

export const PRO_CREATE_TIMEOUT_MS: number = 25000

export const PRO_PAYMENT_LINK_TIMEOUT_MS: number = 15000

export const PRO_MAX_BINS_PER_SERVICE: number = 2

export const PRO_BOOKING_MODES: [ProBookingMode, ...ProBookingMode[]] = ['payment_link', 'offline']

export const PRO_CREATE_ERROR_CODES: ProCreateErrorCode[] = [
  ...PRO_RESCHEDULE_FORCEABLE_CODES,
  'invalidInput',
  'invalidAddress',
  'invalidQuantities',
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
  'bins',
  'date',
]

export const PRO_CREATE_FIELD_IDS: Record<ProCreateField, string> = {
  firstName: `${PRO_CREATE_ID_PREFIX}-first-name`,
  lastName: `${PRO_CREATE_ID_PREFIX}-last-name`,
  email: `${PRO_CREATE_ID_PREFIX}-email`,
  phone: `${PRO_CREATE_ID_PREFIX}-phone`,
  address: `${PRO_CREATE_ID_PREFIX}-address`,
  bins: `${PRO_CREATE_ID_PREFIX}-bins`,
  date: `${PRO_CREATE_ID_PREFIX}-date`,
}

export const PRO_PAYMENT_LINK_MAX_RESENDS: number = 3
