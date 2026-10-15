export type Escape = (text: string) => string

export type EmailContact = {
  firstName: string
  lastName: string
  company: string
  email: string
  phone: string
}

/**
 * Renders one labelled field of a notification email.
 * @param label - Field label, trusted text
 * @param value - Field value, already escaped HTML
 * @returns HTML of the field
 */
export const emailField = (label: string, value: string): string => `
  <div class="field">
    <div class="label">${label}</div>
    <div class="value">${value}</div>
  </div>`

/**
 * Renders a long text block, such as a message or a comment, inside an email field.
 * @param value - Text already escaped for HTML
 * @returns HTML of the block
 */
export const emailTextBlock = (value: string): string => `<div class="block">${value}</div>`

/**
 * Renders the identity and contact fields shared by every notification email.
 * @param contact - Contact details typed by the visitor, as plain text
 * @param escape - Function escaping untrusted text for HTML
 * @returns HTML of the name, company, email and phone fields
 */
export const emailContactFields = (contact: EmailContact, escape: Escape): string =>
  [
    emailField('Nom', `${escape(contact.lastName)} ${escape(contact.firstName)}`),
    contact.company ? emailField('Société / Collectivité', escape(contact.company)) : '',
    emailField('Email', `<a href="mailto:${escape(contact.email)}">${escape(contact.email)}</a>`),
    emailField('Téléphone', `<a href="tel:${escape(contact.phone)}">${escape(contact.phone)}</a>`),
  ].join('')

/**
 * Wraps the fields of a notification email sent to BINOVYA in the shared layout.
 * @param content - HTML of the fields
 * @param footer - Footer text, trusted
 * @returns Full email document as HTML
 */
export const renderEmailLayout = (content: string, footer: string): string => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; }
        .content { padding: 40px; }
        .field { margin-bottom: 24px; }
        .label { font-size: 12px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .value { font-size: 15px; color: #000000; line-height: 1.5; }
        .value a { color: #0b7fb8; }
        .block { white-space: pre-wrap; padding: 16px; background-color: #f9f9f9; border-radius: 4px; line-height: 1.6; }
        .footer { padding: 20px 40px; text-align: center; font-size: 12px; color: #999999; border-top: 1px solid #e5e5e5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content">${content}</div>
        <div class="footer">${footer}</div>
      </div>
    </body>
  </html>
`
