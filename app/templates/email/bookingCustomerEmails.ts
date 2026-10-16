import type { BookingEmailContent, BookingEmailData } from '@/types/email'

import {
  bookingAmountLabel,
  bookingDateLabel,
  bookingDetailsBlock,
} from '@/templates/email/bookingDetails'
import { describeBins } from '@/templates/email/labels'
import {
  type Escape,
  emailButton,
  emailField,
  emailFieldTable,
  emailParagraph,
  emailTitle,
  renderEmailLayout,
} from '@/templates/email/layout'

type RefundEmailData = BookingEmailData & {
  bookingUrl: string
}

type ConfirmationEmailData = BookingEmailData & {
  accountUrl?: string
}

const greeting = (booking: BookingEmailData, escape: Escape): string =>
  emailParagraph(`Bonjour ${escape(booking.firstName)},`)

const QUESTIONS_PARAGRAPH: string = emailParagraph(
  'Une question ? Répondez simplement à ce mail, nous vous répondrons rapidement.',
)

const trackingParagraph = (accountUrl: string, escape: Escape): string =>
  emailParagraph(
    `Vos réservations et les photos avant/après de vos bacs restent consultables en ligne : <a href="${escape(accountUrl)}">Suivre ma réservation</a>. Indiquez simplement votre adresse mail pour recevoir un lien de connexion.`,
  )

/**
 * Builds the confirmation sent to the customer once the booking is paid.
 * @param booking - Paid booking, its customer and the optional login page URL, as plain text
 * @param escape - Function escaping untrusted text for HTML
 * @returns Subject and HTML body of the email
 */
export const generateBookingConfirmationEmail = (
  booking: ConfirmationEmailData,
  escape: Escape,
): BookingEmailContent => ({
  subject: `Votre réservation BINOVYA du ${bookingDateLabel(booking)} est confirmée`,
  html: renderEmailLayout({
    title: 'Votre réservation est confirmée',
    preheader: `Paiement reçu : passage prévu le ${escape(bookingDateLabel(booking))}. Retrouvez le récapitulatif de votre réservation.`,
    content: [
      emailTitle('Votre réservation est confirmée'),
      greeting(booking, escape),
      emailParagraph(
        'Merci pour votre paiement. Nous passerons nettoyer vos bacs à la date indiquée ci-dessous.',
      ),
      bookingDetailsBlock(booking, escape),
      emailParagraph(
        '<strong>Le jour du passage, vos bacs doivent être vides et accessibles.</strong> Nous passons dans la journée, sans heure fixe.',
      ),
      emailParagraph('Vous recevrez un rappel par mail un ou deux jours avant le passage.'),
      booking.accountUrl ? trackingParagraph(booking.accountUrl, escape) : '',
      QUESTIONS_PARAGRAPH,
    ].join(''),
  }),
})

/**
 * Builds the reminder sent to the customer one or two days before the intervention.
 * @param booking - Paid booking and its customer, as plain text
 * @param escape - Function escaping untrusted text for HTML
 * @returns Subject and HTML body of the email
 */
export const generateBookingReminderEmail = (
  booking: BookingEmailData,
  escape: Escape,
): BookingEmailContent => ({
  subject: `Rappel : passage BINOVYA le ${bookingDateLabel(booking)}`,
  html: renderEmailLayout({
    title: 'Votre passage approche',
    preheader: `Nous passons le ${escape(bookingDateLabel(booking))}. Pensez à vider vos bacs et à les laisser accessibles.`,
    content: [
      emailTitle('Votre passage approche'),
      greeting(booking, escape),
      emailParagraph(
        `Nous passons nettoyer vos bacs le <strong>${escape(bookingDateLabel(booking))}</strong>.`,
      ),
      emailFieldTable(
        emailField('Adresse', escape(booking.address)) +
          emailField('Bacs', escape(describeBins(booking))),
        'details',
      ),
      emailParagraph(
        '<strong>Pensez à vider vos bacs et à les laisser accessibles ce jour-là.</strong> Nous passons dans la journée, sans heure fixe.',
      ),
      QUESTIONS_PARAGRAPH,
    ].join(''),
  }),
})

/**
 * Builds the notice sent to the customer when a payment arrived too late and was refunded.
 * @param booking - Refunded booking, its customer and the booking page URL, as plain text
 * @param escape - Function escaping untrusted text for HTML
 * @returns Subject and HTML body of the email
 */
export const generateBookingRefundEmail = (
  booking: RefundEmailData,
  escape: Escape,
): BookingEmailContent => ({
  subject: 'Votre réservation BINOVYA a été annulée et remboursée',
  html: renderEmailLayout({
    title: 'Votre réservation a été annulée',
    preheader: `Le montant de ${escape(bookingAmountLabel(booking))} vous est intégralement remboursé.`,
    content: [
      emailTitle('Votre réservation a été annulée'),
      greeting(booking, escape),
      emailParagraph(
        `Votre paiement pour le passage du ${escape(bookingDateLabel(booking))} nous est parvenu alors que votre réservation n'était plus active : le délai de paiement était dépassé et la place n'était plus disponible, ou la réservation avait été annulée.`,
      ),
      emailParagraph(
        `Votre réservation est donc annulée et le montant de <strong>${escape(bookingAmountLabel(booking))}</strong> vous est intégralement remboursé. Le remboursement apparaît sur votre compte sous 5 à 10 jours ouvrés, selon votre banque.`,
      ),
      booking.bookingUrl ? emailButton('Réserver une autre date', escape(booking.bookingUrl)) : '',
      QUESTIONS_PARAGRAPH,
    ].join(''),
  }),
})
