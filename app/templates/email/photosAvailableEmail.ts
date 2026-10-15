import type { BookingEmailContent, BookingEmailData } from '@/types/email'

import { bookingDateLabel, EMAIL_FOOTER } from '@/templates/email/bookingDetails'
import {
  type Escape,
  emailButton,
  emailParagraph,
  emailSteps,
  emailTitle,
  renderEmailLayout,
} from '@/templates/email/layout'

type PhotosAvailableEmailData = BookingEmailData & {
  loginUrl: string
  siteUrl: string
}

const siteLink = (siteUrl: string, escape: Escape): string =>
  siteUrl ? `<a href="${escape(siteUrl)}">${escape(siteUrl)}</a>` : 'notre site'

/**
 * Builds the email telling the customer that the before and after photos are available.
 * @param data - Completed booking, its customer, the one-click login URL and the site URL
 * @param escape - Function escaping untrusted text for HTML
 * @returns Subject and HTML body of the email
 */
export const generatePhotosAvailableEmail = (
  data: PhotosAvailableEmailData,
  escape: Escape,
): BookingEmailContent => ({
  subject: 'Vos photos avant/après sont disponibles',
  html: renderEmailLayout(
    [
      emailTitle('Vos photos avant/après sont disponibles'),
      emailParagraph(`Bonjour ${escape(data.firstName)},`),
      emailParagraph(
        `Notre intervention du ${escape(bookingDateLabel(data))} au ${escape(data.address)} est terminée. Les photos avant et après de vos bacs vous attendent dans votre espace client.`,
      ),
      emailButton('Voir mes photos', escape(data.loginUrl)),
      emailParagraph(
        'Ce bouton vous connecte en un clic. Si le lien a expiré, suivez ces étapes :',
      ),
      emailSteps([
        `Rendez-vous sur ${siteLink(data.siteUrl, escape)}.`,
        'Cliquez sur « Espace client ».',
        `Saisissez votre adresse e-mail : <strong>${escape(data.email)}</strong>.`,
        'Ouvrez le mail que vous recevez et cliquez sur le lien de connexion.',
      ]),
    ].join(''),
    EMAIL_FOOTER,
  ),
})
