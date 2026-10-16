import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createCustomer, patchProfile, type AccountCustomer } from '../../support/account'
import { postJson } from '../../support/api'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { BASE_URL, adminMailbox, uniqueTestEmail } from '../../support/env'
import { findLink, htmlToText, normalizeSpaces, waitForOneMail } from '../../support/outbox'

import type { MailOutboxRecord } from '../../../app/types/email'

const FIRST_NAME = '<img src=x onerror=alert(1)>Ada'

const LOGIN_SUBJECT = 'Votre lien de connexion à votre espace BINOVYA'

let customer: AccountCustomer

const requestLink = async (locale: 'fr' | 'en'): Promise<MailOutboxRecord> => {
  const since = new Date()
  await patchProfile(customer.id, { login_link_sent_at: null, login_link_count: 0 })
  const response = await postJson('/api/auth/login', {
    email: customer.email,
    locale,
    website: '',
  })
  expect(response.status).toBe(200)
  return waitForOneMail({ to: customer.email, subjectIncludes: LOGIN_SUBJECT, since })
}

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  customer = await createCustomer({
    email: uniqueTestEmail('mail-login'),
    firstName: FIRST_NAME,
  })
})

afterAll(async () => {
  await cleanupE2eData()
})

describe('login link mail', () => {
  it('goes to the customer with the fixed subject and BINOVYA as reply-to', async () => {
    const mail = await requestLink('fr')
    expect(mail.to).toBe(customer.email)
    expect(mail.subject).toBe(LOGIN_SUBJECT)
    expect(mail.replyTo).toBe(adminMailbox())
    expect(mail.idempotencyKey).toBeNull()
  })

  it('has a "Me connecter" button to the confirm page of the test site, token in the fragment', async () => {
    const mail = await requestLink('fr')
    const href = findLink(mail.html, '/account/confirm')
    expect(href).toBeDefined()
    const url = new URL(href ?? '')
    expect(url.origin).toBe(BASE_URL)
    expect(url.pathname).toBe('/account/confirm')
    expect(url.search).toBe('')
    expect(new URLSearchParams(url.hash.slice(1)).get('token_hash')).toMatch(/^[a-f0-9]{20,}$/)
    expect(new URLSearchParams(url.hash.slice(1)).has('type')).toBe(false)
    expect(mail.html).toMatch(/class="button"[^>]*>Me connecter<\/a>/)
  })

  it('points to the /en confirm page for an English request', async () => {
    const mail = await requestLink('en')
    expect(new URL(findLink(mail.html, '/account/confirm') ?? '').pathname).toBe(
      '/en/account/confirm',
    )
  })

  it('mentions the 24 hours validity and escapes the first name', async () => {
    const mail = await requestLink('fr')
    expect(normalizeSpaces(htmlToText(mail.html))).toContain('valable 24 heures')
    expect(mail.html).not.toContain('<img')
    expect(mail.html).toContain('&lt;img src=x onerror=alert(1)&gt;Ada')
  })
})
