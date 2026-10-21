import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  createAdmin,
  readAdminThrottle,
  removeE2eAdmins,
  setAdminThrottle,
} from '../../support/admin'
import { postJson } from '../../support/api'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { BASE_URL, uniqueTestEmail } from '../../support/env'
import { findLink, htmlToText, normalizeSpaces, waitForOneMail } from '../../support/outbox'

import type { MailOutboxRecord } from '../../../app/types/email'
import type { AccountCustomer } from '../../support/account'

const ADMIN_SUBJECT = 'Votre lien de connexion à BINOVYA Pro'

let admin: AccountCustomer

const requestLink = async (locale: 'fr' | 'en'): Promise<MailOutboxRecord> => {
  const since = new Date()
  if (await readAdminThrottle(admin.id)) {
    await setAdminThrottle(admin.id, {
      sent_at: new Date(Date.now() - 2 * 60_000).toISOString(),
      link_count: 0,
    })
  }
  const response = await postJson('/api/pro/auth/login', {
    email: admin.email,
    locale,
    website: '',
  })
  expect(response.status).toBe(200)
  return waitForOneMail({ to: admin.email, subjectIncludes: ADMIN_SUBJECT, since })
}

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  admin = await createAdmin(uniqueTestEmail('mail-admin'))
})

afterAll(async () => {
  await removeE2eAdmins()
})

describe('admin login link mail', () => {
  it('goes to the admin with the fixed subject', async () => {
    const mail = await requestLink('fr')
    expect(mail.to).toBe(admin.email)
    expect(mail.subject).toBe(ADMIN_SUBJECT)
    expect(mail.idempotencyKey).toBeNull()
  })

  it('has a "Me connecter" button to the Pro confirm page, token in the fragment only', async () => {
    const mail = await requestLink('fr')
    const href = findLink(mail.html, '/pro/confirm')
    expect(href).toBeDefined()
    const url = new URL(href ?? '')
    expect(url.origin).toBe(BASE_URL)
    expect(url.pathname).toBe('/pro/confirm')
    expect(url.search).toBe('')
    expect(new URLSearchParams(url.hash.slice(1)).get('token_hash')).toMatch(/^[a-f0-9]{20,}$/)
    expect(new URLSearchParams(url.hash.slice(1)).has('type')).toBe(false)
    expect(mail.html).toMatch(/class="button"[^>]*>Me connecter<\/a>/)
  })

  it('points to the /en confirm page for an English request but stays in French', async () => {
    const mail = await requestLink('en')
    expect(new URL(findLink(mail.html, '/pro/confirm') ?? '').pathname).toBe('/en/pro/confirm')
    expect(mail.subject).toBe(ADMIN_SUBJECT)
  })

  it('mentions the 24 hours validity and the Pro area', async () => {
    const mail = await requestLink('fr')
    const text = normalizeSpaces(htmlToText(mail.html))
    expect(text).toContain('valable 24 heures')
    expect(text).toContain('BINOVYA Pro')
  })
})
