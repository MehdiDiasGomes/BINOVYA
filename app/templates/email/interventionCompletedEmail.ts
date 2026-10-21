import type { BookingEmailContent } from '@/types/email'

import { QUESTIONS_PARAGRAPH } from '@/templates/email/bookingCustomerEmails'
import { bookingDateLabel } from '@/templates/email/bookingDetails'
import { describeBins } from '@/templates/email/labels'
import {
  type Escape,
  emailField,
  emailFieldTable,
  emailParagraph,
  emailTitle,
  renderEmailLayout,
} from '@/templates/email/layout'
import {
  type CustomerAreaEmailData,
  customerAreaAccess,
} from '@/templates/email/photosAvailableEmail'

const COMPLETED_TITLE = 'Votre intervention est terminée'

/**
 * Builds the email telling the customer that their bins were cleaned, for an intervention
 * finished without the before and after photos.
 * @param data - Completed booking, its customer, the customer area login page (`/login`, empty to
 * omit the button) and the site URL
 * @param escape - Function escaping untrusted text for HTML
 * @returns Subject and HTML body of the email
 */
export const generateInterventionCompletedEmail = (
  data: CustomerAreaEmailData,
  escape: Escape,
): BookingEmailContent => ({
  subject: COMPLETED_TITLE,
  html: renderEmailLayout({
    title: COMPLETED_TITLE,
    preheader: `Vos bacs ont été nettoyés le ${escape(bookingDateLabel(data))}. Merci pour votre confiance.`,
    content: [
      emailTitle(COMPLETED_TITLE),
      emailParagraph(`Bonjour ${escape(data.firstName)},`),
      emailParagraph('Nous avons nettoyé et désinfecté vos bacs. Merci pour votre confiance !'),
      emailFieldTable(
        [
          emailField("Date d'intervention", escape(bookingDateLabel(data))),
          emailField('Adresse', escape(data.address)),
          emailField('Bacs', escape(describeBins(data))),
        ].join(''),
        'details',
      ),
      emailParagraph('Votre réservation reste consultable dans votre espace client.'),
      customerAreaAccess(data, 'Voir ma réservation', escape),
      QUESTIONS_PARAGRAPH,
    ].join(''),
  }),
})
