import type { AccountTranslate } from '@/types/account'
import type { MediaCardTone } from '@/types/mediaCard'
import type {
  ProBookingStatus,
  ProCustomer,
  ProIntervention,
  ProInterventionView,
} from '@/types/pro'

import { ACCOUNT_STATUS_TONES } from '@/constants/account'
import { WEEKDAYS_MONDAY_FIRST } from '@/constants/booking'
import {
  PRO_ADMIN_ONLY_STATUSES,
  PRO_EXPIRED_LINK_TONE,
  PRO_PENDING_PAYMENT_TONE,
} from '@/constants/pro'
import { formatWeekday } from '@/utils/date'

const PRO_STATUS_TONES: Record<ProBookingStatus, MediaCardTone> = {
  ...ACCOUNT_STATUS_TONES,
  pending_payment: PRO_PENDING_PAYMENT_TONE,
  expired: PRO_EXPIRED_LINK_TONE,
}

const ADMIN_PAYMENT_KEYS: Partial<Record<ProBookingStatus, string>> = {
  cancelled: 'pro.intervention.payments.refunded',
  pending_payment: 'pro.intervention.payments.awaitingLink',
  expired: 'pro.intervention.payments.linkExpired',
}

const paymentKey = (intervention: ProIntervention): string => {
  const statusKey: string | undefined = ADMIN_PAYMENT_KEYS[intervention.status]
  if (statusKey) {
    return statusKey
  }
  return intervention.paymentMethod === 'offline'
    ? 'pro.intervention.payments.offline'
    : 'pro.intervention.payments.paid'
}

/**
 * Maps an intervention to its card tone and payment label: refunded once cancelled, awaiting the
 * payment link BINOVYA sent or that link expired, paid outside the site, or paid online. The
 * payment is worth a line on the card only when it is not a plain online payment.
 * @param intervention - Intervention shown in the BINOVYA Pro area
 * @returns Presentation data of the intervention
 */
export const proInterventionView = (intervention: ProIntervention): ProInterventionView => ({
  tone: PRO_STATUS_TONES[intervention.status],
  paymentKey: paymentKey(intervention),
  hasPaymentNote:
    PRO_ADMIN_ONLY_STATUSES.includes(intervention.status) ||
    (intervention.status !== 'cancelled' && intervention.paymentMethod === 'offline'),
})

/**
 * Formats the full name of a customer, last name first as on a delivery round.
 * @param customer - Customer of the intervention, null when the profile is missing
 * @param t - Translation function of the page
 * @returns Full name, or a translated placeholder when unknown
 */
export const proCustomerName = (customer: ProCustomer | null, t: AccountTranslate): string => {
  const name: string = customer ? `${customer.lastName} ${customer.firstName}`.trim() : ''
  return name.length > 0 ? name : t('pro.intervention.unknownCustomer', {})
}

/**
 * Lists collection weekdays as translated day names from Monday, such as « lundi, jeudi ».
 * @param weekdays - Weekday numbers, 0 for Sunday
 * @param locale - BCP 47 locale of the page
 * @returns Day names separated by commas, empty when no day is known
 */
export const collectionWeekdaysLabel = (weekdays: number[], locale: string): string =>
  WEEKDAYS_MONDAY_FIRST.filter(weekday => weekdays.includes(weekday))
    .map(weekday => formatWeekday(weekday, locale))
    .join(', ')
