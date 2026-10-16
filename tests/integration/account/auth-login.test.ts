import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  countAuthUsersByEmail,
  countProfilesByEmail,
  createCustomer,
  patchProfile,
  readProfileState,
  type AccountCustomer,
} from '../../support/account'
import { postJson, type ApiResult } from '../../support/api'
import { assertTestStripeKey, cleanupE2eData, rest } from '../../support/db'
import { readEnv, uniqueTestEmail } from '../../support/env'
import { mailsAfterSettling } from '../../support/outbox'

const LOGIN_SUBJECT = 'Votre lien de connexion'

const TWO_MINUTES_AGO = (): string => new Date(Date.now() - 2 * 60_000).toISOString()

const HOURS_AGO = (hours: number): string => new Date(Date.now() - hours * 3_600_000).toISOString()

const requestLink = (email: string, extra: Record<string, unknown> = {}): Promise<ApiResult> =>
  postJson('/api/auth/login', { email, locale: 'fr', website: '', ...extra })

let known: AccountCustomer
let throttled: AccountCustomer
let changed: AccountCustomer

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  known = await createCustomer({ email: uniqueTestEmail('known'), firstName: 'Connue' })
  throttled = await createCustomer({ email: uniqueTestEmail('throttle'), firstName: 'Limite' })
  changed = await createCustomer({ email: uniqueTestEmail('changed'), firstName: 'Changee' })
})

afterAll(async () => {
  await cleanupE2eData()
})

describe('POST /api/auth/login: input', () => {
  it('rejects an invalid email with 400', async () => {
    expect((await requestLink('not-an-email')).status).toBe(400)
  })

  it('rejects an empty body with 400', async () => {
    expect((await postJson('/api/auth/login', {})).status).toBe(400)
  })

  it('rejects an unsupported locale with 400', async () => {
    expect((await requestLink(known.email, { locale: 'de' })).status).toBe(400)
  })

  it('rejects a body above 4 KiB with 413', async () => {
    expect((await requestLink(known.email, { website: 'x'.repeat(5000) })).status).toBe(413)
  })

  it('rejects a honeypot above 200 characters with 400', async () => {
    expect((await requestLink(known.email, { website: 'x'.repeat(300) })).status).toBe(400)
  })
})

describe('POST /api/auth/login: neutral answer', () => {
  it('answers 200 success for an unknown address and creates no account', async () => {
    const email = uniqueTestEmail('unknown')
    const result = await requestLink(email)
    expect(result.status).toBe(200)
    expect(result.body).toEqual({ success: true })
    expect(await countProfilesByEmail(email)).toBe(0)
    expect(await countAuthUsersByEmail(email)).toBe(0)
  })

  it('answers 200 success when the honeypot is filled and records nothing', async () => {
    const result = await requestLink(throttled.email, { website: 'https://spam.test' })
    expect(result.status).toBe(200)
    expect(result.body).toEqual({ success: true })
    expect((await readProfileState(throttled.id)).login_link_sent_at).toBeNull()
  })

  it('gives the same raw body for unknown, known and throttled addresses', async () => {
    const unknown = await requestLink(uniqueTestEmail('unknown2'))
    const first = await requestLink(known.email)
    const second = await requestLink(known.email)
    expect([unknown.raw, first.raw, second.raw]).toEqual([unknown.raw, unknown.raw, unknown.raw])
    expect([unknown.status, first.status, second.status]).toEqual([200, 200, 200])
  })
})

describe('POST /api/auth/login: known customer', () => {
  it('records the claim in the database', async () => {
    const state = await readProfileState(known.id)
    expect(state.login_link_sent_at).not.toBeNull()
    expect(state.login_link_count).toBe(1)
    expect(state.login_link_window_start).not.toBeNull()
  })

  it('does not claim again within 60 seconds', async () => {
    const before = await readProfileState(known.id)
    expect((await requestLink(known.email)).status).toBe(200)
    const after = await readProfileState(known.id)
    expect(after.login_link_count).toBe(before.login_link_count)
    expect(after.login_link_sent_at).toBe(before.login_link_sent_at)
  })

  it('matches the email whatever its case', async () => {
    await patchProfile(known.id, { login_link_sent_at: TWO_MINUTES_AGO(), login_link_count: 1 })
    await requestLink(known.email.toUpperCase())
    expect((await readProfileState(known.id)).login_link_count).toBe(2)
  })
})

describe('POST /api/auth/login: rolling 24 h cap', () => {
  it('claims the fifth link of the window, then refuses the sixth', async () => {
    await patchProfile(throttled.id, {
      login_link_sent_at: TWO_MINUTES_AGO(),
      login_link_count: 4,
      login_link_window_start: HOURS_AGO(1),
    })
    await requestLink(throttled.email)
    const fifth = await readProfileState(throttled.id)
    expect(fifth.login_link_count).toBe(5)

    await patchProfile(throttled.id, { login_link_sent_at: TWO_MINUTES_AGO() })
    await requestLink(throttled.email)
    const sixth = await readProfileState(throttled.id)
    expect(sixth.login_link_count).toBe(5)
    expect(new Date(sixth.login_link_sent_at ?? 0).getTime()).toBeLessThan(Date.now() - 60_000)
  })

  it('starts a new window once 24 hours have passed', async () => {
    await patchProfile(throttled.id, {
      login_link_sent_at: TWO_MINUTES_AGO(),
      login_link_count: 5,
      login_link_window_start: HOURS_AGO(25),
    })
    await requestLink(throttled.email)
    const state = await readProfileState(throttled.id)
    expect(state.login_link_count).toBe(1)
    expect(new Date(state.login_link_window_start ?? 0).getTime()).toBeGreaterThan(
      Date.now() - 60_000,
    )
  })

  it('refuses the claim_login_link RPC to the anon role', async () => {
    const response = await fetch(
      `${readEnv('NUXT_PUBLIC_SUPABASE_URL')}/rest/v1/rpc/claim_login_link`,
      {
        method: 'POST',
        headers: {
          apikey: readEnv('NUXT_PUBLIC_SUPABASE_KEY'),
          Authorization: `Bearer ${readEnv('NUXT_PUBLIC_SUPABASE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_email: known.email }),
      },
    )
    expect([401, 403, 404]).toContain(response.status)
  })
})

describe('POST /api/auth/login: Auth email changed in admin', () => {
  it('sends no mail to the old or the new address and still answers success', async () => {
    const changedEmail = uniqueTestEmail('changed-new')
    await rest(`/auth/v1/admin/users/${changed.id}`, {
      method: 'PUT',
      body: JSON.stringify({ email: changedEmail, email_confirm: true }),
    })
    const since = new Date()
    const result = await requestLink(changed.email)
    expect(result).toMatchObject({ status: 200, body: { success: true } })
    const oldMails = await mailsAfterSettling({
      to: changed.email,
      subjectIncludes: LOGIN_SUBJECT,
      since,
    })
    const newMails = await mailsAfterSettling(
      { to: changedEmail, subjectIncludes: LOGIN_SUBJECT, since },
      0,
    )
    expect([oldMails.length, newMails.length]).toEqual([0, 0])
  })
})
