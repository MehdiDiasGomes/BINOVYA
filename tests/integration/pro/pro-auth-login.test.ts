import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { sleep } from '../../../scripts/test-process'
import { createCustomer, readProfileState, type AccountCustomer } from '../../support/account'
import {
  createAdmin,
  readAdminThrottle,
  removeE2eAdmins,
  setAdminThrottle,
  waitForAdminThrottle,
} from '../../support/admin'
import { postJson, type ApiResult } from '../../support/api'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { readEnv, uniqueTestEmail } from '../../support/env'
import { mailsAfterSettling } from '../../support/outbox'

const ADMIN_SUBJECT = 'Votre lien de connexion à BINOVYA Pro'

const CUSTOMER_SUBJECT = 'Votre lien de connexion à votre espace BINOVYA'

const SETTLE_MS = 1500

const TWO_MINUTES_AGO = (): string => new Date(Date.now() - 2 * 60_000).toISOString()

const HOURS_AGO = (hours: number): string => new Date(Date.now() - hours * 3_600_000).toISOString()

const requestLink = (email: string, extra: Record<string, unknown> = {}): Promise<ApiResult> =>
  postJson('/api/pro/auth/login', { email, locale: 'fr', website: '', ...extra })

let admin: AccountCustomer
let throttledAdmin: AccountCustomer
let customer: AccountCustomer

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  admin = await createAdmin(uniqueTestEmail('admin-login'))
  throttledAdmin = await createAdmin(uniqueTestEmail('admin-throttle'))
  customer = await createCustomer({ email: uniqueTestEmail('admin-cust'), firstName: 'Cliente' })
})

afterAll(async () => {
  await cleanupE2eData()
  await removeE2eAdmins()
})

describe('POST /api/pro/auth/login: input', () => {
  it('rejects an invalid email with 400', async () => {
    expect((await requestLink('not-an-email')).status).toBe(400)
  })

  it('rejects an unsupported locale with 400', async () => {
    expect((await requestLink(admin.email, { locale: 'de' })).status).toBe(400)
  })

  it('rejects a body above 4 KiB with 413', async () => {
    expect((await requestLink(admin.email, { website: 'x'.repeat(5000) })).status).toBe(413)
  })

  it('rejects a honeypot above 200 characters with 400', async () => {
    expect((await requestLink(admin.email, { website: 'x'.repeat(300) })).status).toBe(400)
  })
})

describe('POST /api/pro/auth/login: neutral answer', () => {
  it('gives the same raw answer for an admin, an unknown address, a customer, a honeypot and a throttled admin', async () => {
    const answers: ApiResult[] = [
      await requestLink(admin.email),
      await requestLink(uniqueTestEmail('admin-unknown')),
      await requestLink(customer.email),
      await requestLink(throttledAdmin.email, { website: 'https://spam.test' }),
      await requestLink(admin.email),
    ]
    expect(answers.map(answer => answer.status)).toEqual([200, 200, 200, 200, 200])
    expect(new Set(answers.map(answer => answer.raw)).size).toBe(1)
    expect(answers[0]?.body).toEqual({ success: true })
  })

  it('claims a link for the admin only', async () => {
    const claimed = await waitForAdminThrottle(admin.id, row => row !== null)
    expect(claimed?.link_count).toBe(1)
    await sleep(SETTLE_MS)
    expect(await readAdminThrottle(throttledAdmin.id)).toBeNull()
  })

  it('does not claim anything on the customer profile', async () => {
    expect((await readProfileState(customer.id)).login_link_sent_at).toBeNull()
  })

  it('sends the mail of the first request to the admin only, not to the customer nor the second request', async () => {
    const adminMails = await mailsAfterSettling({ to: admin.email, subjectIncludes: ADMIN_SUBJECT })
    const customerMails = await mailsAfterSettling({ to: customer.email }, 0)
    expect([adminMails.length, customerMails.length]).toEqual([1, 0])
  })

  it('matches the admin email whatever its case', async () => {
    await setAdminThrottle(admin.id, { sent_at: TWO_MINUTES_AGO() })
    await requestLink(admin.email.toUpperCase())
    const claimed = await waitForAdminThrottle(admin.id, row => row?.link_count === 2)
    expect(claimed?.link_count).toBe(2)
  })
})

describe('POST /api/pro/auth/login: throttle', () => {
  it('does not claim again within 60 seconds', async () => {
    const before = await readAdminThrottle(admin.id)
    expect((await requestLink(admin.email)).status).toBe(200)
    await sleep(SETTLE_MS)
    expect(await readAdminThrottle(admin.id)).toEqual(before)
  })

  it('claims the fifth link of the window, then refuses the sixth', async () => {
    await requestLink(throttledAdmin.email)
    await waitForAdminThrottle(throttledAdmin.id, row => row !== null)
    await setAdminThrottle(throttledAdmin.id, {
      sent_at: TWO_MINUTES_AGO(),
      link_count: 4,
      window_start: HOURS_AGO(1),
    })
    await requestLink(throttledAdmin.email)
    const fifth = await waitForAdminThrottle(throttledAdmin.id, row => row?.link_count === 5)
    expect(fifth?.link_count).toBe(5)

    await setAdminThrottle(throttledAdmin.id, { sent_at: TWO_MINUTES_AGO() })
    const sixth = await requestLink(throttledAdmin.email)
    expect(sixth.body).toEqual({ success: true })
    await sleep(SETTLE_MS)
    const state = await readAdminThrottle(throttledAdmin.id)
    expect(state?.link_count).toBe(5)
    expect(new Date(state?.sent_at ?? 0).getTime()).toBeLessThan(Date.now() - 60_000)
  })

  it('starts a new window once 24 hours have passed', async () => {
    await setAdminThrottle(throttledAdmin.id, {
      sent_at: TWO_MINUTES_AGO(),
      link_count: 5,
      window_start: HOURS_AGO(25),
    })
    await requestLink(throttledAdmin.email)
    const state = await waitForAdminThrottle(throttledAdmin.id, row => row?.link_count === 1)
    expect(state?.link_count).toBe(1)
  })

  it('refuses the claim_admin_login_link RPC to the anon role', async () => {
    const response = await fetch(
      `${readEnv('NUXT_PUBLIC_SUPABASE_URL')}/rest/v1/rpc/claim_admin_login_link`,
      {
        method: 'POST',
        headers: {
          apikey: readEnv('NUXT_PUBLIC_SUPABASE_KEY'),
          Authorization: `Bearer ${readEnv('NUXT_PUBLIC_SUPABASE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_email: admin.email }),
      },
    )
    expect([401, 403, 404]).toContain(response.status)
  })
})

describe('POST /api/auth/login with an admin address', () => {
  it('answers success, claims no admin link and sends no mail', async () => {
    const since = new Date()
    const before = await readAdminThrottle(throttledAdmin.id)
    const result = await postJson('/api/auth/login', {
      email: throttledAdmin.email,
      locale: 'fr',
      website: '',
    })
    expect(result).toMatchObject({ status: 200, body: { success: true } })
    await sleep(SETTLE_MS)
    expect(await readAdminThrottle(throttledAdmin.id)).toEqual(before)
    const mails = await mailsAfterSettling(
      { to: throttledAdmin.email, subjectIncludes: CUSTOMER_SUBJECT, since },
      1500,
    )
    expect(mails).toEqual([])
  })
})
