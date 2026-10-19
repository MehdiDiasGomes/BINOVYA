import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { WEEKDAYS_MONDAY_FIRST } from '../../../app/constants/booking'
import {
  PRO_AVAILABILITY_HORIZON_DAYS,
  PRO_AVAILABILITY_MAX_RANGE_DAYS,
} from '../../../app/constants/pro'
import { addDaysToIsoDate } from '../../../app/utils/date'
import { removeE2eAdmins } from '../../support/admin'
import { getApi, sendApi, type ApiResult } from '../../support/api'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import {
  FAR_RANGES,
  farDates,
  openProSessions,
  readOverride,
  removeOverrides,
} from '../../support/pro'
import { parisDateFromToday } from '../../support/seed'

import type { ProAvailability } from '../../../app/types/proAvailability'

type Method = 'GET' | 'PUT' | 'DELETE'

type AccessCase = { name: string; method: Method; path: string; body?: unknown }

const [DAY] = farDates(FAR_RANGES.availabilityAccess) as [string]

const CASES: AccessCase[] = [
  { name: 'GET availability', method: 'GET', path: '/api/pro/availability' },
  {
    name: 'PUT rules',
    method: 'PUT',
    path: '/api/pro/availability/rules',
    body: { rules: [{ weekday: 1, maxBookings: 1 }] },
  },
  {
    name: 'PUT override',
    method: 'PUT',
    path: `/api/pro/availability/overrides/${DAY}`,
    body: { maxBookings: 1, note: null },
  },
  { name: 'DELETE override', method: 'DELETE', path: `/api/pro/availability/overrides/${DAY}` },
]

const WRITE_CASES: AccessCase[] = CASES.filter(entry => entry.method !== 'GET')

let adminCookie: string
let customerCookie: string

const call = (entry: AccessCase, cookie?: string): Promise<ApiResult> =>
  entry.method === 'GET'
    ? getApi(entry.path, cookie)
    : sendApi(entry.method, entry.path, { cookie, body: entry.body })

const callWithOrigin = (entry: AccessCase, origin: string | null): Promise<ApiResult> =>
  sendApi(entry.method as 'PUT' | 'DELETE', entry.path, {
    cookie: adminCookie,
    body: entry.body,
    origin,
  })

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  await removeOverrides([DAY])
  ;({ adminCookie, customerCookie } = await openProSessions('avail-access'))
})

afterAll(async () => {
  await removeOverrides([DAY])
  await cleanupE2eData()
  await removeE2eAdmins()
})

describe('access rules of the availability routes', () => {
  it.each(CASES)('$name answers 401 without session', async entry => {
    expect((await call(entry)).status).toBe(401)
  })

  it.each(CASES)('$name answers 403 to a customer session', async entry => {
    expect((await call(entry, customerCookie)).status).toBe(403)
  })

  it.each(WRITE_CASES)(
    '$name answers 403 forbiddenOrigin without an Origin header, even for an admin',
    async entry => {
      const result = await callWithOrigin(entry, null)
      expect(result.status).toBe(403)
      expect(result.body.data?.code).toBe('forbiddenOrigin')
    },
  )

  it.each(WRITE_CASES)('$name answers 403 forbiddenOrigin with a foreign Origin', async entry => {
    const result = await callWithOrigin(entry, 'https://evil.example.com')
    expect(result.status).toBe(403)
    expect(result.body.data?.code).toBe('forbiddenOrigin')
  })

  it('leaves the database untouched when a write is refused', async () => {
    await call(CASES[2] as AccessCase, customerCookie)
    await callWithOrigin(CASES[2] as AccessCase, null)
    expect(await readOverride(DAY)).toBeNull()
  })
})

describe('GET /api/pro/availability', () => {
  it('is never cached', async () => {
    const result = await getApi('/api/pro/availability', adminCookie)
    expect(result.status).toBe(200)
    expect(result.headers.get('cache-control')).toBe('private, no-store')
  })

  it('defaults to today and the end of the horizon, with seven rules', async () => {
    const result = await getApi('/api/pro/availability', adminCookie)
    const body = result.body as unknown as ProAvailability
    expect(body.from).toBe(parisDateFromToday(0))
    expect(body.to).toBe(addDaysToIsoDate(parisDateFromToday(0), PRO_AVAILABILITY_HORIZON_DAYS))
    expect(body.rules.map(rule => rule.weekday)).toEqual([...WEEKDAYS_MONDAY_FIRST].sort())
  })

  it('lists only days with an exception or a status to watch', async () => {
    await sendApi('PUT', `/api/pro/availability/overrides/${DAY}`, {
      cookie: adminCookie,
      body: { maxBookings: 0, note: 'Liste' },
    })
    const result = await getApi(
      `/api/pro/availability?from=${DAY}&to=${addDaysToIsoDate(DAY, 6)}`,
      adminCookie,
    )
    const days = (result.body as unknown as ProAvailability).days
    expect(days.map(day => day.date)).toEqual([DAY])
    expect(days[0]).toMatchObject({ isClosed: true, capacitySource: 'override', note: 'Liste' })
  })

  it('accepts a range of exactly the maximum and refuses one day more', async () => {
    const from = parisDateFromToday(0)
    const query = (days: number): string =>
      `/api/pro/availability?from=${from}&to=${addDaysToIsoDate(from, days)}`
    expect((await getApi(query(PRO_AVAILABILITY_MAX_RANGE_DAYS), adminCookie)).status).toBe(200)
    expect((await getApi(query(PRO_AVAILABILITY_MAX_RANGE_DAYS + 1), adminCookie)).status).toBe(400)
  })

  it.each(['from=2026-02-30', 'to=demain', 'from=2026-12-02&to=2026-12-01'])(
    'answers 400 to the query %s',
    async query => {
      expect((await getApi(`/api/pro/availability?${query}`, adminCookie)).status).toBe(400)
    },
  )
})
