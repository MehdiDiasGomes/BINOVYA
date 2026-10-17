import type { AccountBooking, AccountBookingCardView, AccountTranslate } from '@/types/account'

import { ACCOUNT_STATUS_ICONS, ACCOUNT_STATUS_TONES } from '@/constants/account'
import { formatFullDate } from '@/utils/date'
import { capitalizeFirst } from '@/utils/text'

/**
 * Maps a booking to what its card and its page display: tone, status icon and label, amount
 * label, reminder for an upcoming booking, rebooking link for a cancelled one.
 * @param booking - Booking shown in the customer area
 * @returns Presentation data of the booking
 */
export const bookingCardView = (booking: AccountBooking): AccountBookingCardView => ({
  tone: ACCOUNT_STATUS_TONES[booking.status],
  icon: ACCOUNT_STATUS_ICONS[booking.status],
  statusKey: `account.booking.statuses.${booking.status}`,
  amountKey: booking.status === 'cancelled' ? 'account.booking.refunded' : 'account.booking.amount',
  showReminder: booking.status === 'paid',
  showRebook: booking.status === 'cancelled',
})

/**
 * Formats the date of a booking as a long date starting with an uppercase letter.
 * @param scheduledDate - ISO calendar date of the booking
 * @param locale - BCP 47 locale of the page
 * @returns Long date, such as « Mercredi 18 novembre 2026 »
 */
export const bookingDateLabel = (scheduledDate: string, locale: string): string =>
  capitalizeFirst(formatFullDate(scheduledDate, locale), locale)

/**
 * Summarises the bins of a booking, such as « 1 × Petit bac + 2 × Grand bac ».
 * @param booking - Booking or intervention with its bin counts
 * @param t - Translation function of the page
 * @returns Translated summary of the booked bins
 */
export const bookingServicesLabel = (
  booking: Pick<AccountBooking, 'smallBinCount' | 'largeBinCount'>,
  t: AccountTranslate,
): string =>
  [
    { quantity: booking.smallBinCount, serviceKey: 'booking.bins.small.title' },
    { quantity: booking.largeBinCount, serviceKey: 'booking.bins.large.title' },
  ]
    .filter(line => line.quantity > 0)
    .map(line =>
      t('booking.summary.line', { quantity: line.quantity, service: t(line.serviceKey, {}) }),
    )
    .join(' + ')
