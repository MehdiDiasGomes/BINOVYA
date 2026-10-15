import {
  type EmailContact,
  type Escape,
  emailContactFields,
  emailField,
  emailFieldTable,
  emailTextBlock,
  emailTitle,
  renderEmailLayout,
} from '@/templates/email/layout'

type ContactEmailData = EmailContact & {
  subjectLabel: string
  message: string
}

const TITLE = 'Nouveau message de contact'

/**
 * Builds the email sent to BINOVYA when a visitor uses the contact form.
 * @param data - Contact request details, as plain text
 * @param escape - Function escaping untrusted text for HTML
 * @returns Email body as HTML
 */
export const generateContactEmailHtml = (data: ContactEmailData, escape: Escape): string =>
  renderEmailLayout({
    title: TITLE,
    preheader: `${escape(data.subjectLabel)} : message de ${escape(data.firstName)} ${escape(data.lastName)}`,
    variant: 'notification',
    content: [
      emailTitle(TITLE),
      emailFieldTable(
        [
          emailContactFields(data, escape),
          emailField('Objet', escape(data.subjectLabel)),
          emailField('Message', emailTextBlock(escape(data.message))),
        ].join(''),
        'list',
      ),
    ].join(''),
  })
