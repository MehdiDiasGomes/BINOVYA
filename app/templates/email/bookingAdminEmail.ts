import type { BookingEmailContent, BookingEmailData, RefundCreditNote } from '@/types/email'

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
  emailParagraph,
  emailSubtitle,
  emailTitle,
  renderEmailLayout,
} from '@/templates/email/layout'
import { formatPrice } from '@/utils/pricing'

const TITLE = 'Nouvelle réservation payée'

const CREDIT_NOTE_TITLE = 'Avoir Stripe à émettre'

const EMAIL_LOCALE = 'fr-FR'

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

/**
 * Builds the alert sent to BINOVYA when Stripe refused the credit note of a refunded booking, so
 * the admin issues it by hand from the Stripe dashboard. Carries Stripe and booking references
 * only, no customer data.
 * @param creditNote - Booking, invoice, refund and refunded amount
 * @param escape - Function escaping untrusted text for HTML
 * @returns Subject and HTML body of the email
 */
export const generateCreditNoteAlert = (
  creditNote: RefundCreditNote,
  escape: Escape,
): BookingEmailContent => ({
  subject: `${CREDIT_NOTE_TITLE} - réservation ${creditNote.bookingId}`,
  html: renderEmailLayout({
    title: CREDIT_NOTE_TITLE,
    preheader: `Remboursement de ${escape(formatPrice(creditNote.amountCents, EMAIL_LOCALE))} sans avoir`,
    variant: 'notification',
    content: [
      emailTitle(CREDIT_NOTE_TITLE),
      emailParagraph(
        'Le paiement de cette réservation a été remboursé, mais Stripe a refusé l’avoir qui annule sa facture. Émettez-le depuis le tableau de bord Stripe, sur la facture ci-dessous, en le liant au remboursement.',
      ),
      emailFieldTable(
        [
          emailField('Réservation', escape(creditNote.bookingId)),
          emailField('Facture Stripe', escape(creditNote.invoiceId)),
          emailField('Remboursement Stripe', escape(creditNote.refundId)),
          emailField(
            'Montant remboursé',
            escape(formatPrice(creditNote.amountCents, EMAIL_LOCALE)),
          ),
        ].join(''),
        'details',
      ),
    ].join(''),
  }),
})
