import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  createCustomer,
  openSession,
  seedAccountBookings,
  sessionCookie,
  type AccountBookingSeed,
  type AccountCustomer,
} from '../../support/account'
import { createAdmin, removeE2eAdmins } from '../../support/admin'
import { getApi } from '../../support/api'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { uniqueTestEmail } from '../../support/env'
import { FAR_RANGES, farDates } from '../../support/pro'

import type { ProCreatePrefill } from '../../../app/types/proCreate'

const [DAY] = farDates(FAR_RANGES.integrationProRecreate) as [string, string]

const PAST_HOLD = new Date(Date.now() - 3_600_000).toISOString()

let adminCookie = ''
let customerCookie = ''
let customer: AccountCustomer
let ids: Record<string, string>

const prefillOf = (id: string, cookie: string = adminCookie) =>
  getApi(`/api/pro/interventions/${id}/prefill`, cookie)

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  const admin = await createAdmin(uniqueTestEmail('prefill-admin'))
  customer = await createCustomer({ email: uniqueTestEmail('prefill-cust'), firstName: 'Cliente' })
  adminCookie = sessionCookie((await openSession(admin.email)).raw)
  customerCookie = sessionCookie((await openSession(customer.email)).raw)
  const seeds: [string, AccountBookingSeed][] = [
    [
      'expiredLink',
      {
        customerId: customer.id,
        status: 'expired',
        scheduledDate: DAY,
        createdByAdmin: true,
        checkoutSessionId: 'cs_test_prefill',
        expiresAt: PAST_HOLD,
        adminNote: 'Code portail 42',
      },
    ],
    [
      'expiredNoLink',
      { customerId: customer.id, status: 'expired', scheduledDate: DAY, createdByAdmin: true },
    ],
    [
      'expiredOnline',
      {
        customerId: customer.id,
        status: 'expired',
        scheduledDate: DAY,
        checkoutSessionId: 'cs_test_online_prefill',
      },
    ],
    [
      'pendingAdmin',
      {
        customerId: customer.id,
        status: 'pending_payment',
        scheduledDate: DAY,
        createdByAdmin: true,
        checkoutSessionId: 'cs_test_pending_prefill',
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      },
    ],
  ]
  const created: string[] = await seedAccountBookings(seeds.map(([, seed]) => seed))
  ids = Object.fromEntries(seeds.map(([name], index) => [name, created[index] ?? '']))
})

afterAll(async () => {
  await cleanupE2eData()
  await removeE2eAdmins()
})

describe('GET /api/pro/interventions/[id]/prefill', () => {
  it('returns the customer, the re-signed address, the bins and the note of an expired admin link', async () => {
    const result = await prefillOf(ids.expiredLink ?? '')
    expect(result.status).toBe(200)
    const prefill = result.body as unknown as ProCreatePrefill
    expect(prefill.contact).toMatchObject({ email: customer.email, firstName: 'Cliente' })
    expect(prefill.address.token).toEqual(expect.any(String))
    expect(prefill).toMatchObject({
      plan: 'one_off',
      smallBinCount: 1,
      largeBinCount: 0,
      quoteAmountCents: null,
      note: 'Code portail 42',
    })
    expect(result.headers.get('cache-control')).toBe('private, no-store')
  })

  it('answers 404 for an admin expired booking that never had a session', async () => {
    expect((await prefillOf(ids.expiredNoLink ?? '')).status).toBe(404)
  })

  it('answers 404 for an online expired booking', async () => {
    expect((await prefillOf(ids.expiredOnline ?? '')).status).toBe(404)
  })

  it('answers 404 for a booking still pending', async () => {
    expect((await prefillOf(ids.pendingAdmin ?? '')).status).toBe(404)
  })

  it('answers 404 for a malformed or unknown id', async () => {
    expect((await prefillOf('not-a-uuid')).status).toBe(404)
    expect((await prefillOf(crypto.randomUUID())).status).toBe(404)
  })

  it('answers 401 without session and 403 to a customer', async () => {
    expect((await prefillOf(ids.expiredLink ?? '', '')).status).toBe(401)
    expect((await prefillOf(ids.expiredLink ?? '', customerCookie)).status).toBe(403)
  })
})
