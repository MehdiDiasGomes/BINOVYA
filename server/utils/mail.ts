import juice from 'juice'
import { Resend } from 'resend'

import { EMAIL_FOOTER_LINKS_SLOT, emailFooterLinks } from '@/templates/email/layout'

type OutgoingEmail = {
  to: string
  subject: string
  html: string
  replyTo?: string
  idempotencyKey?: string
}

const DEFAULT_MAIL_SENDER = 'BINOVYA <contact@dg-zenith.com>'

const SEND_TIMEOUT_MS = 5000

const SEND_TIMEOUT = Symbol('timeout')

const JUICE_OPTIONS: juice.Options = {
  preserveMediaQueries: true,
  preserveImportant: true,
  applyAttributesTableElements: true,
  removeStyleTags: true,
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '{': '&#123;',
  '}': '&#125;',
}

Object.keys(juice.codeBlocks).forEach(key => Reflect.deleteProperty(juice.codeBlocks, key))

/**
 * Escapes text so it can be inserted safely in an HTML email.
 * @param text - Untrusted text typed by a visitor
 * @returns Text with HTML special characters and template braces escaped
 */
export const escapeHtml = (text: string): string =>
  text.replace(/[&<>"'{}]/g, character => HTML_ESCAPES[character] ?? character)

/**
 * Replaces control characters, such as line breaks, so stored text cannot alter an email subject.
 * @param subject - Subject built from database or visitor values
 * @returns Subject on a single line
 */
export const sanitizeEmailSubject = (subject: string): string => subject.replace(/\p{Cc}/gu, ' ')

/**
 * Returns the sender of every email, set by `NUXT_MAIL_FROM` with a fallback on the test domain.
 * @returns Sender in the `Name <address>` format
 */
export const mailSender = (): string => useRuntimeConfig().mailFrom || DEFAULT_MAIL_SENDER

/**
 * Fills the footer links from `NUXT_CONTACT_EMAIL_TO` and `NUXT_SITE_URL`, then inlines the
 * `<style>` block of an email so clients that drop it still render the design. Media queries stay
 * in a `<style>` tag for the clients that support them.
 * @param html - Email document built with `renderEmailLayout`
 * @returns Email document ready to send
 */
export const finalizeEmailHtml = (html: string): string => {
  const { siteUrl, contactEmailTo } = useRuntimeConfig()
  const links: string = emailFooterLinks(
    { siteUrl: siteUrl || '', contactEmail: contactEmailTo || '' },
    escapeHtml,
  )
  return juice(
    html.replace(EMAIL_FOOTER_LINKS_SLOT, () => links),
    JUICE_OPTIONS,
  )
}

/**
 * Sends one transactional email through Resend, giving up after 5 seconds. A failure is logged
 * with the given label only, never thrown, so the caller's flow always continues.
 * @param email - Recipient, subject, HTML body, inlined here, and optional idempotency key
 * @param logLabel - Short label without personal data, used in logs
 * @returns True when Resend accepted the email
 */
export const sendTransactionalEmail = async (
  email: OutgoingEmail,
  logLabel: string,
): Promise<boolean> => {
  const { resendApiKey } = useRuntimeConfig()
  if (!resendApiKey) {
    console.warn(`${logLabel} skipped: NUXT_RESEND_API_KEY is not set`)
    return false
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout: Promise<typeof SEND_TIMEOUT> = new Promise(resolve => {
    timer = setTimeout(() => resolve(SEND_TIMEOUT), SEND_TIMEOUT_MS)
  })
  try {
    const response = await Promise.race([
      new Resend(resendApiKey).emails.send(
        {
          from: mailSender(),
          to: [email.to],
          subject: sanitizeEmailSubject(email.subject),
          html: finalizeEmailHtml(email.html),
          replyTo: email.replyTo,
        },
        email.idempotencyKey ? { idempotencyKey: email.idempotencyKey } : undefined,
      ),
      timeout,
    ])
    if (response === SEND_TIMEOUT) {
      console.error(`${logLabel} timed out`)
      return false
    }
    if (response.error) {
      console.error(`${logLabel} failed`, response.error.name)
      return false
    }
    return true
  } catch {
    console.error(`${logLabel} failed`)
    return false
  } finally {
    clearTimeout(timer)
  }
}
