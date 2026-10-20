import type { BookingEmailContent, BookingEmailData } from '@/types/email'

import { QUESTIONS_PARAGRAPH } from '@/templates/email/bookingCustomerEmails'
import { bookingAmountLabel, bookingDateLabel } from '@/templates/email/bookingDetails'
import { PLAN_LABELS, describeBins } from '@/templates/email/labels'
import {
  type Escape,
  emailAmountField,
  emailButton,
  emailField,
  emailFieldTable,
  emailParagraph,
  emailTitle,
  renderEmailLayout,
} from '@/templates/email/layout'
import { formatBusinessDateTime } from '@/utils/date'

export type PaymentLinkEmailData = BookingEmailData & {
  paymentUrl: string
  paymentDueAt: string
}

const PAYMENT_LINK_SUBJECT = 'Votre intervention BINOVYA : finalisez le paiement'

const PAYMENT_LINK_TITLE = 'Finalisez le paiement de votre intervention'

const EMAIL_LOCALE = 'fr-FR'

/**
 * Builds the email sending the customer the Stripe payment link of an intervention BINOVYA
 * created for them, with the deadline after which the slot is released.
 * @param data - Pending booking, its customer, the Checkout URL and the payment deadline
 * (ISO timestamp), as plain text
 * @param escape - Function escaping untrusted text for HTML
 * @returns Subject and HTML body of the email
 */
export const generatePaymentLinkEmail = (
  data: PaymentLinkEmailData,
  escape: Escape,
): BookingEmailContent => {
  const deadline: string = formatBusinessDateTime(data.paymentDueAt, EMAIL_LOCALE)
  return {
    subject: PAYMENT_LINK_SUBJECT,
    html: renderEmailLayout({
      title: PAYMENT_LINK_TITLE,
      preheader: `Réglez ${escape(bookingAmountLabel(data))} avant le ${escape(deadline)} pour confirmer le passage du ${escape(bookingDateLabel(data))}.`,
      content: [
        emailTitle(PAYMENT_LINK_TITLE),
        emailParagraph(`Bonjour ${escape(data.firstName)},`),
        emailParagraph(
          `Nous avons préparé votre intervention du <strong>${escape(bookingDateLabel(data))}</strong>. Pour la confirmer, réglez-la en ligne avant le <strong>${escape(deadline)}</strong>.`,
        ),
        emailFieldTable(
          [
            emailField("Date d'intervention", escape(bookingDateLabel(data))),
            emailField('Adresse', escape(data.address)),
            emailField('Bacs', escape(describeBins(data))),
            emailField('Formule', escape(PLAN_LABELS[data.plan])),
            emailAmountField('Montant à régler', escape(bookingAmountLabel(data))),
          ].join(''),
          'details',
        ),
        emailButton('Payer mon intervention', escape(data.paymentUrl)),
        emailParagraph(
          'Le paiement est sécurisé par Stripe, notre prestataire de paiement. Vous recevrez la confirmation par mail dès le paiement reçu.',
        ),
        emailParagraph(
          'Sans paiement avant cette échéance, le créneau est libéré et le lien ne fonctionne plus.',
        ),
        QUESTIONS_PARAGRAPH,
      ].join(''),
    }),
  }
}
