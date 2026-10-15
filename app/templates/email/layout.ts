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
 * Renders a heading at the top of an email sent to a customer.
 * @param text - Heading, already escaped HTML
 * @returns HTML of the heading
 */
export const emailTitle = (text: string): string => `<h1 class="title">${text}</h1>`

/**
 * Renders a paragraph of an email sent to a customer.
 * @param text - Paragraph, already escaped HTML
 * @returns HTML of the paragraph
 */
export const emailParagraph = (text: string): string => `<p class="text">${text}</p>`

/**
 * Renders a call-to-action link styled as a button.
 * @param label - Button label, trusted text
 * @param url - Target URL, already escaped
 * @returns HTML of the button
 */
export const emailButton = (label: string, url: string): string =>
  `<p class="action"><a class="button" href="${url}">${label}</a></p>`

/**
 * Renders an ordered list of steps.
 * @param steps - Steps, already escaped HTML
 * @returns HTML of the list
 */
export const emailSteps = (steps: string[]): string => {
  const items: string = steps.map(step => '<li>' + step + '</li>').join('')
  return `<ol class="steps">${items}</ol>`
}

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
 * Wraps the content of an email in the shared layout.
 * @param content - HTML of the fields
 * @param footer - Footer text, trusted
 * @returns Full email document as HTML
 */
export const renderEmailLayout = (content: string, footer: string): string => `
  <!DOCTYPE html>
  <html lang="fr">
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
        .title { font-size: 22px; color: #000000; margin: 0 0 24px; }
        .text { font-size: 15px; color: #000000; line-height: 1.6; margin: 0 0 20px; }
        .action { margin: 28px 0; text-align: center; }
        .button { display: inline-block; padding: 14px 28px; background-color: #0975ab; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; }
        .steps { font-size: 15px; color: #000000; line-height: 1.6; padding-left: 20px; margin: 0 0 20px; }
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
