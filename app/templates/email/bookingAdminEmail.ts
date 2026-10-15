import type { BookingEmailContent, BookingEmailData } from '@/types/email'

import {
  bookingAmountLabel,
  bookingDateLabel,
  bookingDetailsFields,
} from '@/templates/email/bookingDetails'
import {
  type Escape,
  emailContactFields,
  emailField,
  emailFieldTable,
  emailSubtitle,
  emailTitle,
  renderEmailLayout,
} from '@/templates/email/layout'

const TITLE = 'Nouvelle réservation payée'

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
  html: renderEmailLayout({
    title: TITLE,
    preheader: `${escape(bookingDateLabel(booking))} · ${escape(bookingAmountLabel(booking))} · ${escape(booking.address)}`,
    variant: 'notification',
    content: [
      emailTitle(TITLE),
      emailSubtitle('Client'),
      emailFieldTable(emailContactFields({ ...booking, company: '' }, escape), 'list'),
      emailSubtitle('Réservation'),
      emailFieldTable(
        bookingDetailsFields(booking, escape) + emailField('Référence', escape(booking.id)),
        'details',
      ),
    ].join(''),
  }),
})
