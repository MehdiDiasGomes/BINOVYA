import type { BookingEmailContent, BookingEmailData } from '@/types/email'

import { bookingDateLabel } from '@/templates/email/bookingDetails'
import {
  type Escape,
  emailButton,
  emailParagraph,
  emailSteps,
  emailTitle,
  renderEmailLayout,
} from '@/templates/email/layout'
import { parseSecureUrl } from '@/utils/link'

export type CustomerAreaEmailData = BookingEmailData & {
  accountUrl: string
  siteUrl: string
}

const siteLink = (siteUrl: string, escape: Escape): string =>
  parseSecureUrl(siteUrl) ? `<a href="${escape(siteUrl)}">${escape(siteUrl)}</a>` : 'notre site'

/**
 * Renders the button to the customer area login page and the three steps to sign in.
 * @param data - Booking, its customer, the login page (`/login`, empty to omit the button) and the
 * site URL
 * @param buttonLabel - Visible label of the button, also quoted in the first step
 * @param escape - Function escaping untrusted text for HTML
 * @returns HTML of the button, the introduction and the steps
 */
export const customerAreaAccess = (
  data: CustomerAreaEmailData,
  buttonLabel: string,
  escape: Escape,
): string =>
  [
    data.accountUrl ? emailButton(buttonLabel, escape(data.accountUrl)) : '',
    emailParagraph('Pour accéder à votre espace client :'),
    emailSteps([
      data.accountUrl
        ? `Cliquez sur « ${buttonLabel} », ou rendez-vous sur ${siteLink(data.siteUrl, escape)} puis cliquez sur « Espace client ».`
        : `Rendez-vous sur ${siteLink(data.siteUrl, escape)} puis cliquez sur « Espace client ».`,
      `Saisissez votre adresse mail : <strong>${escape(data.email)}</strong>.`,
      'Ouvrez le mail que vous recevez et cliquez sur le lien de connexion.',
    ]),
  ].join('')

/**
 * Builds the email telling the customer that the before and after photos are available.
 * @param data - Completed booking, its customer, the customer area login page (`/login`, empty to
 * omit the button) and the site URL
 * @param escape - Function escaping untrusted text for HTML
 * @returns Subject and HTML body of the email
 */
export const generatePhotosAvailableEmail = (
  data: CustomerAreaEmailData,
  escape: Escape,
): BookingEmailContent => ({
  subject: 'Vos photos avant/après sont disponibles',
  html: renderEmailLayout({
    title: 'Vos photos avant/après sont disponibles',
    preheader: `Notre intervention du ${escape(bookingDateLabel(data))} est terminée : découvrez vos bacs avant et après.`,
    content: [
      emailTitle('Vos photos avant/après sont disponibles'),
      emailParagraph(`Bonjour ${escape(data.firstName)},`),
      emailParagraph(
        `Notre intervention du ${escape(bookingDateLabel(data))} au ${escape(data.address)} est terminée. Les photos avant et après de vos bacs vous attendent dans votre espace client.`,
      ),
      customerAreaAccess(data, 'Voir mes photos', escape),
    ].join(''),
  }),
})
