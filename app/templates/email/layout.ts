import { EMAIL_BRAND, EMAIL_NOTIFICATION_NOTE, EMAIL_TAGLINE } from '@/templates/email/labels'
import { isPlausibleEmail, parseSecureUrl } from '@/utils/link'

export type Escape = (text: string) => string

export type EmailContact = {
  firstName: string
  lastName: string
  company: string
  email: string
  phone: string
}

export type EmailLayoutOptions = {
  title: string
  preheader: string
  content: string
  variant?: 'customer' | 'notification'
}

export type EmailFooterLinks = {
  siteUrl: string
  contactEmail: string
}

export const EMAIL_FOOTER_LINKS_SLOT = '<!--binovya-footer-links-->'

const HEADING_FONT = "Montserrat, 'Segoe UI', Arial, sans-serif"

const BODY_FONT = "Quicksand, 'Segoe UI', Helvetica, Arial, sans-serif"

const PREHEADER_FILLER: string = '&#847;&zwnj;&nbsp;'.repeat(60)

const EMAIL_STYLES = `
  :root { color-scheme: light; supported-color-schemes: light; }
  body { margin: 0; padding: 0; width: 100%; background-color: #f4f9fb; font-family: ${BODY_FONT}; color: #08131f; -webkit-text-size-adjust: 100%; }
  table { border-collapse: collapse; }
  .preheader { display: none; max-height: 0; max-width: 0; overflow: hidden; opacity: 0; mso-hide: all; font-size: 1px; line-height: 1px; color: #f4f9fb; }
  .wrapper { width: 100%; background-color: #f4f9fb; }
  .wrapper-cell { padding: 32px 12px; }
  .container { max-width: 600px; }
  .card { border-collapse: separate; background-color: #ffffff; border: 1px solid #e6eef2; border-radius: 12px; overflow: hidden; }
  .accent { height: 4px; font-size: 4px; line-height: 4px; mso-line-height-rule: exactly; background-color: #22c0de; border-radius: 12px 12px 0 0; }
  .header { padding: 28px 40px 22px; text-align: center; border-bottom: 1px solid #e6eef2; }
  .header-compact { padding: 18px 32px 14px; text-align: left; }
  .wordmark { margin: 0; font-family: ${HEADING_FONT}; font-size: 26px; font-weight: 800; line-height: 1.2; letter-spacing: 6px; text-transform: uppercase; color: #135a73; }
  .header-compact .wordmark { font-size: 18px; letter-spacing: 4px; }
  .content { padding: 36px 40px 32px; }
  .content-compact { padding: 24px 32px; }
  .title { margin: 0 0 20px; font-family: ${HEADING_FONT}; font-size: 24px; font-weight: 700; line-height: 1.3; color: #08131f; }
  .content-compact .title { margin-bottom: 16px; font-size: 19px; }
  .subtitle { margin: 24px 0 8px; font-family: ${HEADING_FONT}; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #135a73; }
  .text { margin: 0 0 18px; font-size: 15px; line-height: 1.6; color: #08131f; }
  .text a { color: #0975ab; }
  .fields { width: 100%; margin: 0 0 20px; }
  .fields-details { border-collapse: separate; margin: 8px 0 24px; background-color: #e8f4f8; border-radius: 10px; }
  .field-label { width: 36%; padding: 10px 16px 10px 0; text-align: left; vertical-align: top; font-family: ${HEADING_FONT}; font-size: 13px; font-weight: 700; line-height: 1.5; letter-spacing: 0.6px; text-transform: uppercase; color: #4a5d6e; border-bottom: 1px solid #e6eef2; }
  .field-value { padding: 10px 0; text-align: left; vertical-align: top; font-size: 15px; line-height: 1.5; color: #08131f; border-bottom: 1px solid #e6eef2; }
  .field-value a { color: #0975ab; }
  .fields-details .field-label { padding-left: 20px; border-bottom: 1px solid #d3e7ef; }
  .fields-details .field-value { padding-right: 20px; border-bottom: 1px solid #d3e7ef; }
  .fields-details tr:last-child .field-label, .fields-details tr:last-child .field-value { border-bottom: 0; }
  .field-amount .field-value { font-family: ${HEADING_FONT}; font-size: 18px; font-weight: 700; color: #135a73; }
  .block { padding: 12px 14px; white-space: pre-wrap; line-height: 1.6; background-color: #f4f9fb; border-left: 3px solid #22c0de; }
  .action { width: 100%; margin: 8px 0 24px; }
  .action-cell { padding: 8px 0; text-align: center; }
  .button-table { margin: 0 auto; }
  .button-cell { background-color: #0975ab; border-radius: 8px; mso-padding-alt: 14px 32px; }
  .button { display: inline-block; padding: 14px 32px; font-family: ${HEADING_FONT}; font-size: 15px; font-weight: 700; line-height: 1.2; color: #ffffff; text-decoration: none; border: 1px solid #0975ab; border-radius: 8px; }
  .steps { margin: 0 0 18px; padding-left: 22px; font-size: 15px; line-height: 1.6; color: #08131f; }
  .steps li { margin-bottom: 6px; }
  .steps a { color: #0975ab; }
  .footer { padding: 24px 24px 8px; text-align: center; font-size: 13px; line-height: 1.6; color: #4a5d6e; }
  .footer-brand { margin: 0 0 4px; font-family: ${HEADING_FONT}; font-size: 13px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #135a73; }
  .footer-text { margin: 0 0 6px; color: #4a5d6e; }
  .footer-text a { color: #0975ab; }
  @media only screen and (max-width: 620px) {
    .wrapper-cell { padding: 16px 8px !important; }
    .container { width: 100% !important; }
    .header { padding: 22px 20px 18px !important; }
    .content { padding: 26px 20px 22px !important; }
    .title { font-size: 21px !important; }
    .field-label, .field-value { display: block !important; width: auto !important; }
    .field-label { padding: 12px 0 0 !important; border-bottom: 0 !important; }
    .field-value { padding: 2px 0 12px !important; }
    .fields-details .field-label { padding: 12px 16px 0 !important; }
    .fields-details .field-value { padding: 2px 16px 12px !important; }
  }
`

/**
 * Renders one labelled row of a field table, see `emailFieldTable`.
 * @param label - Field label, trusted text
 * @param value - Field value, already escaped HTML
 * @returns HTML of the row
 */
export const emailField = (label: string, value: string): string => `
  <tr>
    <th class="field-label" scope="row">${label}</th>
    <td class="field-value">${value}</td>
  </tr>`

/**
 * Renders a highlighted row of a field table, used for an amount.
 * @param label - Field label, trusted text
 * @param value - Field value, already escaped HTML
 * @returns HTML of the row
 */
export const emailAmountField = (label: string, value: string): string => `
  <tr class="field-amount">
    <th class="field-label" scope="row">${label}</th>
    <td class="field-value">${value}</td>
  </tr>`

/**
 * Wraps field rows in a two-column label and value table.
 * @param rows - Rows built with `emailField` or `emailAmountField`
 * @param variant - `details` for a summary on a muted background, `list` for plain rows
 * @returns HTML of the table
 */
export const emailFieldTable = (rows: string, variant: 'details' | 'list'): string => `
  <table class="fields fields-${variant}" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tbody>${rows}</tbody>
  </table>`

/**
 * Renders a long text block, such as a message or a comment, inside an email field.
 * @param value - Text already escaped for HTML
 * @returns HTML of the block
 */
export const emailTextBlock = (value: string): string => `<div class="block">${value}</div>`

/**
 * Renders the main heading of an email.
 * @param text - Heading, already escaped HTML
 * @returns HTML of the heading
 */
export const emailTitle = (text: string): string => `<h1 class="title">${text}</h1>`

/**
 * Renders a section heading of an email.
 * @param text - Heading, already escaped HTML
 * @returns HTML of the heading
 */
export const emailSubtitle = (text: string): string => `<h2 class="subtitle">${text}</h2>`

/**
 * Renders a paragraph of an email sent to a customer.
 * @param text - Paragraph, already escaped HTML
 * @returns HTML of the paragraph
 */
export const emailParagraph = (text: string): string => `<p class="text">${text}</p>`

/**
 * Renders a call-to-action link as a table-based button that also works in Outlook.
 * @param label - Button label, trusted text
 * @param url - Target URL, already escaped
 * @returns HTML of the button
 */
export const emailButton = (label: string, url: string): string => `
  <table role="presentation" class="action" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td class="action-cell" align="center">
        <table role="presentation" class="button-table" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="button-cell" align="center"><a class="button" href="${url}">${label}</a></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`

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
 * Renders the identity and contact rows shared by every notification email.
 * @param contact - Contact details typed by the visitor, as plain text
 * @param escape - Function escaping untrusted text for HTML
 * @returns HTML rows of the name, company, email and phone fields
 */
export const emailContactFields = (contact: EmailContact, escape: Escape): string =>
  [
    emailField('Nom', `${escape(contact.lastName)} ${escape(contact.firstName)}`),
    contact.company ? emailField('Société / Collectivité', escape(contact.company)) : '',
    emailField('Email', `<a href="mailto:${escape(contact.email)}">${escape(contact.email)}</a>`),
    emailField('Téléphone', `<a href="tel:${escape(contact.phone)}">${escape(contact.phone)}</a>`),
  ].join('')

const siteHost = (siteUrl: string): string => parseSecureUrl(siteUrl)?.host ?? ''

/**
 * Renders the footer line with the contact address and the site link, replacing
 * `EMAIL_FOOTER_LINKS_SLOT` at send time.
 * @param links - Contact address and site URL, each skipped when empty or not safe to link
 * @param escape - Function escaping text for HTML
 * @returns HTML of the line, empty when neither link is known
 */
export const emailFooterLinks = (links: EmailFooterLinks, escape: Escape): string => {
  const host: string = siteHost(links.siteUrl)
  const items: string[] = [
    isPlausibleEmail(links.contactEmail)
      ? `<a href="mailto:${escape(links.contactEmail)}">${escape(links.contactEmail)}</a>`
      : '',
    host ? `<a href="${escape(links.siteUrl)}">${escape(host)}</a>` : '',
  ].filter(item => item.length > 0)
  return items.length > 0 ? `<p class="footer-text">${items.join(' &middot; ')}</p>` : ''
}

/**
 * Wraps the content of an email in the shared BINOVYA layout, styled by one `<style>` block that
 * is inlined at send time.
 * @param options - Document title, inbox preheader and content HTML, trusted or already escaped,
 * and the `notification` variant for the compact look of internal emails
 * @returns Full email document as HTML
 */
export const renderEmailLayout = (options: EmailLayoutOptions): string => {
  const isCompact: boolean = options.variant === 'notification'
  const headerClass: string = isCompact ? 'header header-compact' : 'header'
  const contentClass: string = isCompact ? 'content content-compact' : 'content'
  const footerNote: string = isCompact
    ? `<p class="footer-text">${EMAIL_NOTIFICATION_NOTE}</p>`
    : ''
  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${options.title}</title>
    <style>${EMAIL_STYLES}</style>
  </head>
  <body>
    <div class="preheader">${options.preheader}${PREHEADER_FILLER}</div>
    <table role="presentation" class="wrapper" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td class="wrapper-cell" align="center">
          <table role="presentation" class="container card" width="600" cellpadding="0" cellspacing="0" border="0">
            <tr><td class="accent" height="4" aria-hidden="true">&nbsp;</td></tr>
            <tr><td class="${headerClass}"><p class="wordmark">${EMAIL_BRAND}</p></td></tr>
            <tr><td class="${contentClass}">${options.content}</td></tr>
          </table>
          <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td class="footer">
                <p class="footer-brand">${EMAIL_BRAND}</p>
                <p class="footer-text">${EMAIL_TAGLINE}</p>
                ${EMAIL_FOOTER_LINKS_SLOT}
                ${footerNote}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`
}
