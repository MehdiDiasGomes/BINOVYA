import type { BookingEmailData } from '@/types/email'

import { PLAN_LABELS, describeBins } from '@/templates/email/labels'
import { type Escape, emailField } from '@/templates/email/layout'
import { formatFullDate } from '@/utils/date'
import { formatPrice } from '@/utils/pricing'

const EMAIL_LOCALE = 'fr-FR'

export const EMAIL_FOOTER = 'BINOVYA, nettoyage de bacs à poubelles'

/**
 * Formats the intervention date of a booking in French, with the weekday and the year.
 * @param booking - Booking described in the email
 * @returns Date such as « lundi 19 octobre 2026 »
 */
export const bookingDateLabel = (booking: BookingEmailData): string =>
  formatFullDate(booking.scheduledDate, EMAIL_LOCALE)

/**
 * Formats the amount paid for a booking in euros, French style.
 * @param booking - Booking described in the email
 * @returns Amount such as « 19,90 € »
 */
export const bookingAmountLabel = (booking: BookingEmailData): string =>
  formatPrice(booking.amountTotalCents, EMAIL_LOCALE)

/**
 * Renders the date, address, bins, plan and amount fields of a booking.
 * @param booking - Booking described in the email, as plain text
 * @param escape - Function escaping untrusted text for HTML
 * @returns HTML of the fields
 */
export const bookingDetailsFields = (booking: BookingEmailData, escape: Escape): string =>
  [
    emailField("Date d'intervention", escape(bookingDateLabel(booking))),
    emailField('Adresse', escape(booking.address)),
    emailField('Bacs', escape(describeBins(booking))),
    emailField('Formule', escape(PLAN_LABELS[booking.plan])),
    emailField('Montant payé', escape(bookingAmountLabel(booking))),
  ].join('')
