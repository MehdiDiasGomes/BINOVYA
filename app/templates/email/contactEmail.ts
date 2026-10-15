import {
  type EmailContact,
  type Escape,
  emailContactFields,
  emailField,
  emailTextBlock,
  renderEmailLayout,
} from '@/templates/email/layout'

type ContactEmailData = EmailContact & {
  subjectLabel: string
  message: string
}

/**
 * Builds the email sent to BINOVYA when a visitor uses the contact form.
 * @param data - Contact request details, as plain text
 * @param escape - Function escaping untrusted text for HTML
 * @returns Email body as HTML
 */
export const generateContactEmailHtml = (data: ContactEmailData, escape: Escape): string =>
  renderEmailLayout(
    [
      emailContactFields(data, escape),
      emailField('Objet', escape(data.subjectLabel)),
      emailField('Message', emailTextBlock(escape(data.message))),
    ].join(''),
    'Nouveau message de contact BINOVYA',
  )
