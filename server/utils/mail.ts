import { randomUUID } from 'node:crypto'

import juice from 'juice'
import { Resend } from 'resend'

import {
  isOutboxAllowed,
  parseMailTransport,
  resolveMailTransport,
  resolveOutboxDir,
  writeOutboxRecord,
} from './mailOutbox'

import type { MailOutboxRecord, MailTransport } from '@/types/email'

import { EMAIL_FOOTER_LINKS_SLOT, emailFooterLinks } from '@/templates/email/layout'

type OutgoingEmail = {
  to: string
  subject: string
  html: string
  replyTo?: string
  idempotencyKey?: string
}

/** Sender used when `NUXT_MAIL_FROM` is empty. */
export const DEFAULT_MAIL_SENDER = 'BINOVYA <contact@dg-zenith.com>'

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

const readMailTransport = (): MailTransport | null => {
  const { mailTransport } = useRuntimeConfig()
  const transport: MailTransport | null = resolveMailTransport(
    mailTransport,
    Boolean(import.meta.dev),
  )
  if (transport === 'resend' && parseMailTransport(mailTransport) === null) {
    console.warn('Unknown NUXT_MAIL_TRANSPORT, mails are sent through Resend')
  }
  return transport
}

/**
 * Tells whether the configured mail transport can send: the outbox needs no Resend key in
 * development and tests, Resend, also used for an unknown transport outside development, needs
 * `NUXT_RESEND_API_KEY`, and an unknown transport refused in development never sends.
 * @returns True when the transport has what it needs to send
 */
export const isMailConfigured = (): boolean => {
  const { mailTransport, resendApiKey } = useRuntimeConfig()
  const isDev: boolean = Boolean(import.meta.dev)
  const transport: MailTransport | null = resolveMailTransport(mailTransport, isDev)
  if (transport === null) {
    return false
  }
  if (transport === 'outbox') {
    return isOutboxAllowed({ isDev, nodeEnv: process.env.NODE_ENV })
  }
  return Boolean(resendApiKey)
}

const sendToOutbox = async (email: OutgoingEmail, logLabel: string): Promise<boolean> => {
  if (!isOutboxAllowed({ isDev: Boolean(import.meta.dev), nodeEnv: process.env.NODE_ENV })) {
    console.error(`${logLabel} failed: Mail outbox transport refused outside development`)
    return false
  }
  try {
    const record: MailOutboxRecord = {
      id: randomUUID(),
      to: email.to,
      from: mailSender(),
      subject: sanitizeEmailSubject(email.subject),
      html: finalizeEmailHtml(email.html),
      replyTo: email.replyTo ?? null,
      idempotencyKey: email.idempotencyKey ?? null,
      logLabel,
      sentAt: new Date().toISOString(),
    }
    const dir: string = resolveOutboxDir(useRuntimeConfig().mailOutboxDir || '', process.cwd())
    return await writeOutboxRecord(dir, record)
  } catch {
    console.error(`${logLabel} failed: mail outbox write error`)
    return false
  }
}

/**
 * Sends one transactional email through Resend, giving up after 5 seconds. With
 * `NUXT_MAIL_TRANSPORT=outbox`, allowed in development and tests only, the email is written to the
 * local outbox instead, see `writeOutboxRecord`. An unknown transport is refused on the
 * development server, see `resolveMailTransport`. A failure is logged with the given label only,
 * never thrown, so the caller's flow always continues.
 * @param email - Recipient, subject, HTML body, inlined here, and optional idempotency key
 * @param logLabel - Short label without personal data, used in logs
 * @returns True when Resend accepted the email, or when it is in the outbox
 */
export const sendTransactionalEmail = async (
  email: OutgoingEmail,
  logLabel: string,
): Promise<boolean> => {
  const transport: MailTransport | null = readMailTransport()
  if (!transport) {
    console.error(`${logLabel} failed: unknown NUXT_MAIL_TRANSPORT refused in development`)
    return false
  }
  if (transport === 'outbox') {
    return sendToOutbox(email, logLabel)
  }
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
