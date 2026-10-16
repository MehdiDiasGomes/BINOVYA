import type { DeletionAlertData, LoginEmailData } from '@/types/account'
import type { BookingEmailContent } from '@/types/email'

import { LOGIN_LINK_LIFETIME_HOURS } from '@/constants/account'
import {
  type Escape,
  emailButton,
  emailContactFields,
  emailField,
  emailFieldTable,
  emailParagraph,
  emailSubtitle,
  emailTitle,
  renderEmailLayout,
} from '@/templates/email/layout'
import { formatFullDate, isoDateInTimeZone } from '@/utils/date'

const LOGIN_TITLE = 'Connexion à votre espace client'

const DELETION_TITLE = 'Demande de suppression de compte'

const EMAIL_LOCALE = 'fr-FR'

const EMAIL_TIME_ZONE = 'Europe/Paris'

/**
 * Builds the email carrying a one-time login link to the customer area.
 * @param data - First name of the customer and login link, as plain text
 * @param escape - Function escaping untrusted text for HTML
 * @returns Subject and HTML body of the email
 */
export const generateLoginLinkEmail = (
  data: LoginEmailData,
  escape: Escape,
): BookingEmailContent => ({
  subject: 'Votre lien de connexion à votre espace BINOVYA',
  html: renderEmailLayout({
    title: LOGIN_TITLE,
    preheader: `Accédez à vos réservations et à vos photos en un clic. Lien valable ${LOGIN_LINK_LIFETIME_HOURS} heures.`,
    content: [
      emailTitle(LOGIN_TITLE),
      emailParagraph(`Bonjour ${escape(data.firstName)},`),
      emailParagraph(
        'Vous avez demandé à accéder à votre espace client BINOVYA, où vous retrouvez vos réservations et les photos avant/après de vos bacs.',
      ),
      emailButton('Me connecter', escape(data.loginUrl)),
      emailParagraph(
        `Ce lien est valable ${LOGIN_LINK_LIFETIME_HOURS} heures et ne sert qu'une seule fois. Passé ce délai, demandez-en un nouveau depuis la page « Espace client » du site.`,
      ),
      emailParagraph(
        "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce mail : sans ce lien, personne ne peut accéder à votre espace.",
      ),
    ].join(''),
  }),
})

/**
 * Builds the alert sent to BINOVYA when a customer requests the deletion of their account.
 * @param data - Customer identity and request time, as plain text
 * @param escape - Function escaping untrusted text for HTML
 * @returns Subject and HTML body of the email
 */
export const generateDeletionRequestAlert = (
  data: DeletionAlertData,
  escape: Escape,
): BookingEmailContent => {
  const requestDate: string = formatFullDate(
    isoDateInTimeZone(new Date(data.requestedAt), EMAIL_TIME_ZONE),
    EMAIL_LOCALE,
  )
  return {
    subject: `${DELETION_TITLE} - ${data.lastName} ${data.firstName}`,
    html: renderEmailLayout({
      title: DELETION_TITLE,
      preheader: `${escape(data.lastName)} ${escape(data.firstName)} · à traiter sous un mois`,
      variant: 'notification',
      content: [
        emailTitle(DELETION_TITLE),
        emailParagraph(
          'Ce client demande la suppression de son espace client. À traiter sous un mois (délai légal RGPD) : les réservations payées sont conservées pour la comptabilité.',
        ),
        emailSubtitle('Client'),
        emailFieldTable(
          emailContactFields({ ...data, company: '' }, escape) +
            emailField('Demande reçue le', escape(requestDate)),
          'list',
        ),
      ].join(''),
    }),
  }
}
