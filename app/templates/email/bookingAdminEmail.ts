import type { BookingEmailContent, BookingEmailData } from '@/types/email'

import {
  bookingDateLabel,
  bookingDetailsFields,
  EMAIL_FOOTER,
} from '@/templates/email/bookingDetails'
import {
  type Escape,
  emailContactFields,
  emailField,
  renderEmailLayout,
} from '@/templates/email/layout'

/**
 * Builds the alert sent to BINOVYA when a booking has just been paid.
 * @param booking - Paid booking and its customer, as plain text
 * @param escape - Function escaping untrusted text for HTML
 * @returns Subject and HTML body of the email
 */
export const generateBookingAdminEmail = (
  booking: BookingEmailData,
  escape: Escape,
): BookingEmailContent => ({
  subject: `Nouvelle réservation payée - ${bookingDateLabel(booking)} - ${booking.lastName} ${booking.firstName}`,
  html: renderEmailLayout(
    [
      emailContactFields({ ...booking, company: '' }, escape),
      bookingDetailsFields(booking, escape),
      emailField('Référence', escape(booking.id)),
    ].join(''),
    `Nouvelle réservation payée. ${EMAIL_FOOTER}`,
  ),
})
