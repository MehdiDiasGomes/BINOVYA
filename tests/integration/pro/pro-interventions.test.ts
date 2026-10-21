import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { PRO_INTERVENTIONS_PAGE_SIZE } from '../../../app/constants/pro'
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

import type { ProInterventionsPage } from '../../../app/types/pro'

const FROM = '2041-04-01'

const TO = '2041-04-30'

const RANGE = `from=${FROM}&to=${TO}`

const BULK_FROM = '2041-06-01'

const BULK_TO = '2041-06-30'

const BULK_COUNT = PRO_INTERVENTIONS_PAGE_SIZE + 3

let cookie: string
let customer: AccountCustomer
let ids: Record<string, string>

const listOf = async (query: string): Promise<ProInterventionsPage> => {
  const result = await getApi(`/api/pro/interventions?${query}`, cookie)
  expect(result.status).toBe(200)
  return result.body as unknown as ProInterventionsPage
}

const idsOf = (page: ProInterventionsPage): string[] =>
  page.interventions.map(intervention => intervention.id)

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  const admin = await createAdmin(uniqueTestEmail('list-admin'))
  cookie = sessionCookie((await openSession(admin.email)).raw)
  customer = await createCustomer({ email: uniqueTestEmail('list-cust'), firstName: 'Liste' })
  const seeds: [string, AccountBookingSeed['status'], string, Partial<AccountBookingSeed>?][] = [
    ['paidLate', 'paid', '2041-04-20'],
    ['completedEarly', 'completed', '2041-04-02'],
    ['cancelledMid', 'cancelled', '2041-04-10'],
    ['pending', 'pending_payment', '2041-04-11'],
    ['expired', 'expired', '2041-04-12'],
    [
      'pendingAdmin',
      'pending_payment',
      '2041-04-13',
      { createdByAdmin: true, expiresAt: '2041-04-12T10:00:00Z' },
    ],
    [
      'expiredAdminLink',
      'expired',
      '2041-04-15',
      { createdByAdmin: true, checkoutSessionId: 'cs_test_expired_link' },
    ],
    ['expiredAdminNoLink', 'expired', '2041-04-16', { createdByAdmin: true }],
    ['paidOffline', 'paid', '2041-04-14', { createdByAdmin: true, paymentMethod: 'offline' }],
    ['paidEdgeFrom', 'paid', FROM],
    ['paidEdgeTo', 'paid', TO],
    ['paidOutside', 'paid', '2041-05-01'],
  ]
  const created: string[] = await seedAccountBookings(
    seeds.map(([, status, scheduledDate, extra]) => ({
      customerId: customer.id,
      status,
      scheduledDate,
      ...extra,
    })),
  )
  ids = Object.fromEntries(seeds.map(([name], index) => [name, created[index] ?? '']))
  await seedAccountBookings(
    Array.from({ length: BULK_COUNT }, () => ({
      customerId: customer.id,
      status: 'paid' as const,
      scheduledDate: BULK_FROM,
    })),
  )
})

afterAll(async () => {
  await cleanupE2eData()
  await removeE2eAdmins()
})

describe('GET /api/pro/interventions data', () => {
  it('returns the page envelope with the page size', async () => {
    const page = await listOf(RANGE)
    expect(page).toMatchObject({ page: 1, pageSize: PRO_INTERVENTIONS_PAGE_SIZE })
    expect(page.total).toBe(page.interventions.length)
  })

  it('lists paid, completed, cancelled and admin-created pending bookings by date, inclusive bounds', async () => {
    const page = await listOf(RANGE)
    expect(idsOf(page)).toEqual([
      ids.paidEdgeFrom,
      ids.completedEarly,
      ids.cancelledMid,
      ids.pendingAdmin,
      ids.paidOffline,
      ids.expiredAdminLink,
      ids.paidLate,
      ids.paidEdgeTo,
    ])
    expect(page.total).toBe(8)
  })

  it('never returns an online pending_payment or an online expired booking', async () => {
    const returned = idsOf(await listOf(`status=all&${RANGE}`))
    expect(returned).not.toContain(ids.pending)
    expect(returned).not.toContain(ids.expired)
  })

  it('returns an admin expired booking only when it had a checkout session', async () => {
    const page = await listOf(`status=expired&${RANGE}`)
    expect(idsOf(page)).toEqual([ids.expiredAdminLink])
    expect(page.interventions[0]).toMatchObject({ status: 'expired', createdByAdmin: true })
    expect(idsOf(await listOf(`status=all&${RANGE}`))).not.toContain(ids.expiredAdminNoLink)
  })

  it('returns the payment fields of an admin-created pending booking', async () => {
    const page = await listOf(`status=pending_payment&${RANGE}`)
    expect(idsOf(page)).toEqual([ids.pendingAdmin])
    expect(page.interventions[0]).toMatchObject({
      status: 'pending_payment',
      createdByAdmin: true,
      paymentMethod: 'stripe',
      paymentDueAt: '2041-04-12T09:59:00.000Z',
    })
  })

  it('returns a booking paid outside the site with its payment method', async () => {
    const page = await listOf(`status=paid&${RANGE}`)
    const offline = page.interventions.find(item => item.id === ids.paidOffline)
    expect(offline).toMatchObject({ paymentMethod: 'offline', createdByAdmin: true })
    expect(offline?.paymentDueAt).toBeNull()
  })

  it.each([
    ['paid', ['paidEdgeFrom', 'paidOffline', 'paidLate', 'paidEdgeTo']],
    ['completed', ['completedEarly']],
    ['cancelled', ['cancelledMid']],
  ])('filters on the status %s', async (status, names) => {
    const page = await listOf(`status=${status}&${RANGE}`)
    expect(idsOf(page)).toEqual(names.map(name => ids[name]))
    expect(page.total).toBe(names.length)
    expect(page.interventions.every(intervention => intervention.status === status)).toBe(true)
  })

  it('applies a lower bound only', async () => {
    const page = await listOf('from=2041-04-20&to=2041-05-01')
    expect(idsOf(page)).toEqual([ids.paidLate, ids.paidEdgeTo, ids.paidOutside])
  })

  it('applies an upper bound only', async () => {
    const page = await listOf('to=2041-04-02')
    expect(page.interventions.every(item => item.scheduledDate <= '2041-04-02')).toBe(true)
    expect(idsOf(page)).toEqual(expect.arrayContaining([ids.paidEdgeFrom, ids.completedEarly]))
  })

  it('returns the customer of each intervention', async () => {
    const [first] = (await listOf(`status=completed&${RANGE}`)).interventions
    expect(first?.customer).toEqual({
      firstName: 'Liste',
      lastName: 'Compte',
      phone: '+33612345678',
    })
  })

  it('accepts a range where from equals to', async () => {
    const page = await listOf(`from=${FROM}&to=${FROM}`)
    expect(idsOf(page)).toEqual([ids.paidEdgeFrom])
  })
})

describe('GET /api/pro/interventions pagination', () => {
  it('returns a full page and the real total', async () => {
    const page = await listOf(`from=${BULK_FROM}&to=${BULK_TO}`)
    expect(page.interventions).toHaveLength(PRO_INTERVENTIONS_PAGE_SIZE)
    expect(page.total).toBe(BULK_COUNT)
  })

  it('returns the remaining rows on page 2 without repeating page 1', async () => {
    const first = await listOf(`from=${BULK_FROM}&to=${BULK_TO}`)
    const second = await listOf(`from=${BULK_FROM}&to=${BULK_TO}&page=2`)
    expect(second.page).toBe(2)
    expect(second.interventions).toHaveLength(BULK_COUNT - PRO_INTERVENTIONS_PAGE_SIZE)
    expect(idsOf(second).filter(id => idsOf(first).includes(id))).toEqual([])
  })

  it('answers 200 with an empty page and the real total beyond the last page', async () => {
    const page = await listOf(`from=${BULK_FROM}&to=${BULK_TO}&page=99`)
    expect(page).toMatchObject({ interventions: [], total: BULK_COUNT, page: 99 })
  })

  it('answers 200 with an empty page for a page beyond a short result', async () => {
    const page = await listOf(`${RANGE}&page=2`)
    expect(page).toMatchObject({ interventions: [], total: 8, page: 2 })
  })

  it('answers 200 with an empty list and a zero total when nothing matches', async () => {
    const page = await listOf('from=2041-12-01&to=2041-12-02')
    expect(page).toMatchObject({ interventions: [], total: 0 })
  })
})
