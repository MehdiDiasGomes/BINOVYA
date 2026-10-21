import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { CALENDAR_GRID_DAY_COUNT } from '../../../app/constants/calendar'
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

import type { ProInterventionDays } from '../../../app/types/proInterventionDays'

const PATH = '/api/pro/interventions/days'

const NO_STORE = 'private, no-store'

const FROM = '2042-03-01'

const TO = '2042-03-31'

const HEAVY_FROM = '2042-05-01'

const HEAVY_TO = '2042-05-31'

const HEAVY_LIMIT = 3000

const INSERT_BATCH = 1000

let adminCookie: string
let customerCookie: string
let customer: AccountCustomer

const query = (from: string, to: string): string => `from=${from}&to=${to}`

const daysOf = async (from: string, to: string): Promise<ProInterventionDays['days']> => {
  const result = await getApi(`${PATH}?${query(from, to)}`, adminCookie)
  expect(result.status).toBe(200)
  return (result.body as unknown as ProInterventionDays).days
}

const seedMany = async (count: number, scheduledDate: string): Promise<void> => {
  const batches: number[] = Array.from(
    { length: Math.ceil(count / INSERT_BATCH) },
    (_unused: unknown, index: number) => Math.min(INSERT_BATCH, count - index * INSERT_BATCH),
  )
  for (const size of batches) {
    const seeds: AccountBookingSeed[] = Array.from({ length: size }, () => ({
      customerId: customer.id,
      status: 'paid' as const,
      scheduledDate,
    }))
    await seedAccountBookings(seeds)
  }
}

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  const admin = await createAdmin(uniqueTestEmail('days-admin'))
  adminCookie = sessionCookie((await openSession(admin.email)).raw)
  customer = await createCustomer({ email: uniqueTestEmail('days-cust'), firstName: 'Jours' })
  customerCookie = sessionCookie((await openSession(customer.email)).raw)
  const seeds: [AccountBookingSeed['status'], string][] = [
    ['paid', '2042-03-05'],
    ['paid', '2042-03-05'],
    ['completed', '2042-03-05'],
    ['cancelled', '2042-03-05'],
    ['pending_payment', '2042-03-05'],
    ['expired', '2042-03-05'],
    ['completed', '2042-03-12'],
    ['cancelled', '2042-03-20'],
    ['paid', '2042-03-01'],
    ['paid', '2042-03-31'],
    ['paid', '2042-04-01'],
  ]
  await seedAccountBookings(
    seeds.map(([status, scheduledDate]) => ({ customerId: customer.id, status, scheduledDate })),
  )
})

afterAll(async () => {
  await cleanupE2eData()
  await removeE2eAdmins()
})

describe('GET /api/pro/interventions/days access', () => {
  it('answers 401 without session', async () => {
    expect((await getApi(`${PATH}?${query(FROM, TO)}`)).status).toBe(401)
  })

  it('answers 403 to a customer session', async () => {
    expect((await getApi(`${PATH}?${query(FROM, TO)}`, customerCookie)).status).toBe(403)
  })

  it('checks the session before the query', async () => {
    expect((await getApi(`${PATH}?from=nope`)).status).toBe(401)
    expect((await getApi(`${PATH}?from=nope`, customerCookie)).status).toBe(403)
  })

  it('sends Cache-Control private, no-store on 200, 400, 401 and 403', async () => {
    const answers = [
      await getApi(`${PATH}?${query(FROM, TO)}`, adminCookie),
      await getApi(`${PATH}?from=nope`, adminCookie),
      await getApi(`${PATH}?${query(FROM, TO)}`),
      await getApi(`${PATH}?${query(FROM, TO)}`, customerCookie),
    ]
    expect(answers.map(answer => answer.status)).toEqual([200, 400, 401, 403])
    expect(answers.map(answer => answer.headers.get('cache-control'))).toEqual(
      Array(4).fill(NO_STORE),
    )
  })
})

describe('GET /api/pro/interventions/days query', () => {
  it.each([
    ['no range', ''],
    ['no to', 'from=2042-03-01'],
    ['no from', 'to=2042-03-01'],
    ['an impossible date', 'from=2042-02-30&to=2042-03-10'],
    ['a reversed range', 'from=2042-03-10&to=2042-03-01'],
    ['a range of 43 days', 'from=2042-03-01&to=2042-04-12'],
    ['a long range', 'from=2042-01-01&to=2042-12-31'],
  ])('answers 400 to %s', async (_name, queryString) => {
    expect((await getApi(`${PATH}?${queryString}`, adminCookie)).status).toBe(400)
  })

  it('accepts a range of exactly the calendar grid size', async () => {
    expect(CALENDAR_GRID_DAY_COUNT).toBe(42)
    expect((await getApi(`${PATH}?from=2042-03-01&to=2042-04-11`, adminCookie)).status).toBe(200)
  })

  it('accepts a range where from equals to', async () => {
    expect(await daysOf('2042-03-12', '2042-03-12')).toEqual([{ date: '2042-03-12', count: 1 }])
  })
})

describe('GET /api/pro/interventions/days data', () => {
  it('counts paid and completed interventions per day, in date order, bounds included', async () => {
    expect(await daysOf(FROM, TO)).toEqual([
      { date: '2042-03-01', count: 1 },
      { date: '2042-03-05', count: 3 },
      { date: '2042-03-12', count: 1 },
      { date: '2042-03-31', count: 1 },
    ])
  })

  it('leaves out cancelled, pending and expired bookings', async () => {
    const dates = (await daysOf(FROM, TO)).map(day => day.date)
    expect(dates).not.toContain('2042-03-20')
  })

  it('leaves out the days outside the range', async () => {
    const dates = (await daysOf(FROM, TO)).map(day => day.date)
    expect(dates).not.toContain('2042-04-01')
  })

  it('answers an empty list when nothing is planned', async () => {
    expect(await daysOf('2042-09-01', '2042-09-10')).toEqual([])
  })
})

describe('GET /api/pro/interventions/days row limit', () => {
  it('counts 3000 interventions of the range', async () => {
    await seedMany(HEAVY_LIMIT, '2042-05-15')
    expect(await daysOf(HEAVY_FROM, HEAVY_TO)).toEqual([{ date: '2042-05-15', count: HEAVY_LIMIT }])
  })

  it('answers 500 with 3001 interventions rather than a wrong count', async () => {
    await seedMany(1, '2042-05-16')
    const result = await getApi(`${PATH}?${query(HEAVY_FROM, HEAVY_TO)}`, adminCookie)
    expect(result.status).toBe(500)
  })
})
