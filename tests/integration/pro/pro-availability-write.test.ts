import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  PRO_AVAILABILITY_HORIZON_DAYS,
  PRO_DAY_CAPACITY_MAX,
  PRO_DAY_NOTE_MAX_LENGTH,
} from '../../../app/constants/pro'
import { addDaysToIsoDate } from '../../../app/utils/date'
import { ADDRESS_TOKEN_TTL_SECONDS } from '../../../server/utils/addressToken'
import {
  LYON_COMMUNE,
  signedAddress,
  signedMunicipality,
  THIONVILLE_ADDRESS,
  THIONVILLE_COMMUNE,
} from '../../support/address'
import { removeE2eAdmins } from '../../support/admin'
import { getApi, sendApi, type ApiResult } from '../../support/api'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import {
  FAR_RANGES,
  farDates,
  openProSessions,
  readOverride,
  readRules,
  removeOverrides,
  restoreRules,
} from '../../support/pro'
import { parisDateFromToday } from '../../support/seed'

import type { BookingAddress } from '../../../app/types/booking'
import type {
  ProAvailability,
  ProDayOverview,
  ProWeekdayRule,
} from '../../../app/types/proAvailability'

const DATES = farDates(FAR_RANGES.availabilityWrite)

const RULES_URL = '/api/pro/availability/rules'

const overrideUrl = (date: string): string => `/api/pro/availability/overrides/${date}`

let adminCookie: string
let originalRules: ProWeekdayRule[]
let luxembourgCommune: BookingAddress

const putOverride = (date: string, body: unknown): Promise<ApiResult> =>
  sendApi('PUT', overrideUrl(date), { cookie: adminCookie, body })

const dayOf = (result: { body: unknown }): ProDayOverview =>
  result.body as unknown as ProDayOverview

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  await removeOverrides(DATES)
  originalRules = await readRules()
  ;({ adminCookie } = await openProSessions('avail-write'))
  const search = await getApi('/api/address/search?q=Luxembourg&country=LU&kind=municipality')
  luxembourgCommune = (search.body as unknown as { suggestions: BookingAddress[] })
    .suggestions[0] as BookingAddress
})

afterAll(async () => {
  if (originalRules) {
    await restoreRules(originalRules)
  }
  await removeOverrides(DATES)
  await cleanupE2eData()
  await removeE2eAdmins()
})

describe('PUT /api/pro/availability/rules', () => {
  it('saves a lowered capacity, returns the seven rules and stores it', async () => {
    const open = originalRules.find(rule => rule.maxBookings > 0)
    expect(open).toBeDefined()
    const weekday = (open as ProWeekdayRule).weekday
    const lowered = (open as ProWeekdayRule).maxBookings - 1
    const result = await sendApi('PUT', RULES_URL, {
      cookie: adminCookie,
      body: { rules: [{ weekday, maxBookings: lowered }] },
    })
    expect(result.status).toBe(200)
    const returned = result.body as unknown as ProWeekdayRule[]
    expect(returned).toHaveLength(7)
    expect(returned.find(rule => rule.weekday === weekday)?.maxBookings).toBe(lowered)
    expect((await readRules()).find(rule => rule.weekday === weekday)?.maxBookings).toBe(lowered)
    const availability = await getApi('/api/pro/availability', adminCookie)
    expect(
      (availability.body as unknown as ProAvailability).rules.find(rule => rule.weekday === weekday)
        ?.maxBookings,
    ).toBe(lowered)
    await restoreRules(originalRules)
    expect((await readRules()).find(rule => rule.weekday === weekday)?.maxBookings).toBe(
      (open as ProWeekdayRule).maxBookings,
    )
  })

  it('leaves the other weekdays untouched when only one is sent', async () => {
    const before = await readRules()
    const first = before[0] as ProWeekdayRule
    const result = await sendApi('PUT', RULES_URL, {
      cookie: adminCookie,
      body: { rules: [{ weekday: first.weekday, maxBookings: first.maxBookings }] },
    })
    expect(result.status).toBe(200)
    expect(await readRules()).toEqual(before)
  })

  it.each([
    ['no rule', { rules: [] }],
    ['no body field', {}],
    [
      'a duplicated weekday',
      {
        rules: [
          { weekday: 1, maxBookings: 1 },
          { weekday: 1, maxBookings: 2 },
        ],
      },
    ],
    [
      'eight rules',
      { rules: Array.from({ length: 8 }, (_u, index) => ({ weekday: index % 7, maxBookings: 1 })) },
    ],
    [
      'a capacity above the maximum',
      { rules: [{ weekday: 1, maxBookings: PRO_DAY_CAPACITY_MAX + 1 }] },
    ],
    ['a negative capacity', { rules: [{ weekday: 1, maxBookings: -1 }] }],
    ['a fractional capacity', { rules: [{ weekday: 1, maxBookings: 1.5 }] }],
    ['a weekday above six', { rules: [{ weekday: 7, maxBookings: 1 }] }],
  ])('answers 400 to %s and writes nothing', async (_name, body) => {
    const before = await readRules()
    const result = await sendApi('PUT', RULES_URL, { cookie: adminCookie, body })
    expect(result.status).toBe(400)
    expect(await readRules()).toEqual(before)
  })

  it('answers 400 when one rule of a valid pair is invalid, so neither is saved', async () => {
    const before = await readRules()
    const result = await sendApi('PUT', RULES_URL, {
      cookie: adminCookie,
      body: {
        rules: [
          { weekday: 1, maxBookings: 1 },
          { weekday: 2, maxBookings: 99 },
        ],
      },
    })
    expect(result.status).toBe(400)
    expect(await readRules()).toEqual(before)
  })

  it('answers 413 to a body over 2 KB', async () => {
    const result = await sendApi('PUT', RULES_URL, {
      cookie: adminCookie,
      body: { rules: [{ weekday: 1, maxBookings: 1 }], padding: 'x'.repeat(3000) },
    })
    expect(result.status).toBe(413)
  })
})

describe('PUT /api/pro/availability/overrides/[date]', () => {
  it('closes a day with a capacity of 0 and returns its overview', async () => {
    const date = DATES[1] as string
    const result = await putOverride(date, { maxBookings: 0, note: '  Jour férié  ' })
    expect(result.status).toBe(200)
    expect(dayOf(result)).toMatchObject({
      date,
      capacity: 0,
      capacitySource: 'override',
      isClosed: true,
      note: 'Jour férié',
      sector: null,
    })
    expect(await readOverride(date)).toMatchObject({ max_bookings: 0, note: 'Jour férié' })
  })

  it('changes the capacity of a day', async () => {
    const date = DATES[2] as string
    const result = await putOverride(date, { maxBookings: 7, note: null })
    expect(dayOf(result)).toMatchObject({
      capacity: 7,
      capacitySource: 'override',
      isClosed: false,
    })
  })

  it('imposes a French commune as the sector of a day', async () => {
    const date = DATES[3] as string
    const result = await putOverride(date, {
      maxBookings: null,
      note: null,
      sector: signedMunicipality(THIONVILLE_COMMUNE),
    })
    expect(result.status).toBe(200)
    expect(dayOf(result)).toMatchObject({
      sector: { latitude: THIONVILLE_COMMUNE.latitude, longitude: THIONVILLE_COMMUNE.longitude },
      sectorLabel: 'Thionville (57100)',
      capacitySource: 'rule',
    })
    expect(await readOverride(date)).toMatchObject({
      max_bookings: null,
      sector_latitude: THIONVILLE_COMMUNE.latitude,
      sector_longitude: THIONVILLE_COMMUNE.longitude,
      sector_label: 'Thionville (57100)',
    })
  })

  it('imposes a Luxembourg commune, found in the fixed list, as the sector of a day', async () => {
    const date = DATES[4] as string
    expect(luxembourgCommune.label).toBe('Luxembourg (LU)')
    expect(luxembourgCommune.postcode).toBe('')
    const result = await putOverride(date, {
      maxBookings: 3,
      note: null,
      sector: luxembourgCommune,
    })
    expect(result.status).toBe(200)
    expect(await readOverride(date)).toMatchObject({
      max_bookings: 3,
      sector_label: 'Luxembourg (LU)',
      sector_latitude: luxembourgCommune.latitude,
      sector_longitude: luxembourgCommune.longitude,
    })
  })

  it('keeps the stored sector when the body has no sector, and removes it with null', async () => {
    const date = DATES[4] as string
    await putOverride(date, { maxBookings: 4, note: 'seule la capacité change' })
    expect(await readOverride(date)).toMatchObject({
      max_bookings: 4,
      sector_label: 'Luxembourg (LU)',
    })
    const removed = await putOverride(date, { maxBookings: 4, note: null, sector: null })
    expect(removed.status).toBe(200)
    expect(await readOverride(date)).toMatchObject({
      sector_latitude: null,
      sector_longitude: null,
      sector_label: null,
    })
  })

  it('deletes the row when an update leaves the exception without any value', async () => {
    const date = DATES[2] as string
    const result = await putOverride(date, { maxBookings: null, note: null })
    expect(result.status).toBe(200)
    expect(await readOverride(date)).toBeNull()
    expect(dayOf(result)).toMatchObject({ capacitySource: 'rule', sector: null, note: null })
  })

  it('refuses an address token where a commune is expected', async () => {
    const date = DATES[5] as string
    const result = await putOverride(date, {
      maxBookings: null,
      note: null,
      sector: signedAddress(THIONVILLE_ADDRESS),
    })
    expect(result.status).toBe(400)
    expect(result.body.data?.code).toBe('invalidAddress')
    expect(await readOverride(date)).toBeNull()
  })

  it.each([
    ['an altered commune', { ...signedMunicipality(THIONVILLE_COMMUNE), city: 'Metz' }],
    [
      'an expired token',
      signedMunicipality(THIONVILLE_COMMUNE, Date.now() - ADDRESS_TOKEN_TTL_SECONDS * 2 * 1000),
    ],
    ['no token', { ...THIONVILLE_COMMUNE, token: '' }],
    ['moved coordinates', { ...signedMunicipality(LYON_COMMUNE), latitude: 49.3595 }],
  ])('refuses %s with invalidAddress', async (_name, sector) => {
    const date = DATES[5] as string
    const result = await putOverride(date, { maxBookings: null, note: 'x', sector })
    expect(result.status).toBe(400)
    expect(result.body.data?.code).toBe('invalidAddress')
    expect(await readOverride(date)).toBeNull()
  })

  it.each([
    ['a capacity above the maximum', { maxBookings: PRO_DAY_CAPACITY_MAX + 1, note: null }],
    ['a negative capacity', { maxBookings: -1, note: null }],
    ['a fractional capacity', { maxBookings: 2.5, note: null }],
    [
      'a note over the maximum length',
      { maxBookings: 1, note: 'a'.repeat(PRO_DAY_NOTE_MAX_LENGTH + 1) },
    ],
    ['no maxBookings field', { note: null }],
    ['no note field', { maxBookings: 1 }],
    [
      'a French commune without postcode',
      {
        maxBookings: null,
        note: null,
        sector: { ...signedMunicipality(THIONVILLE_COMMUNE), postcode: '' },
      },
    ],
    [
      'a commune of another country',
      { maxBookings: null, note: null, sector: { ...luxembourgCommune, countryCode: 'BE' } },
    ],
  ])('answers 400 to %s', async (_name, body) => {
    const date = DATES[5] as string
    const result = await putOverride(date, body)
    expect(result.status).toBe(400)
    expect(await readOverride(date)).toBeNull()
  })

  it('accepts a note of exactly the maximum length', async () => {
    const date = DATES[5] as string
    expect(
      (await putOverride(date, { maxBookings: null, note: 'a'.repeat(PRO_DAY_NOTE_MAX_LENGTH) }))
        .status,
    ).toBe(200)
    await sendApi('DELETE', overrideUrl(date), { cookie: adminCookie })
  })

  it('answers 422 to a past date and writes nothing', async () => {
    const past = parisDateFromToday(-1)
    const before: unknown = await readOverride(past)
    const result = await putOverride(past, { maxBookings: 0, note: null })
    expect(result.status).toBe(422)
    expect(await readOverride(past)).toEqual(before)
  })

  it('answers 400 to an impossible date and to a date beyond the horizon', async () => {
    expect((await putOverride('2026-02-30', { maxBookings: 0, note: null })).status).toBe(400)
    const tooFar = addDaysToIsoDate(parisDateFromToday(0), PRO_AVAILABILITY_HORIZON_DAYS + 1)
    expect((await putOverride(tooFar, { maxBookings: 0, note: null })).status).toBe(400)
  })

  it('accepts the last day of the horizon', async () => {
    const last = addDaysToIsoDate(parisDateFromToday(0), PRO_AVAILABILITY_HORIZON_DAYS)
    expect((await putOverride(last, { maxBookings: null, note: null })).status).toBe(200)
  })

  it('answers 413 to a body over 4 KB', async () => {
    const result = await putOverride(DATES[5] as string, {
      maxBookings: 1,
      note: null,
      padding: 'x'.repeat(5000),
    })
    expect(result.status).toBe(413)
  })
})

describe('DELETE /api/pro/availability/overrides/[date]', () => {
  it('removes an exception so the day follows its weekday rule again', async () => {
    const date = DATES[6] as string
    await putOverride(date, { maxBookings: 0, note: 'à retirer' })
    expect(await readOverride(date)).not.toBeNull()
    const result = await sendApi('DELETE', overrideUrl(date), { cookie: adminCookie })
    expect(result.status).toBe(200)
    expect(dayOf(result)).toMatchObject({ capacitySource: 'rule', note: null, sector: null })
    expect(await readOverride(date)).toBeNull()
  })

  it('succeeds for a day that has no exception', async () => {
    const result = await sendApi('DELETE', overrideUrl(DATES[6] as string), { cookie: adminCookie })
    expect(result.status).toBe(200)
  })

  it('answers 422 to a past date, 400 to an impossible or distant date', async () => {
    const past = parisDateFromToday(-1)
    const before: unknown = await readOverride(past)
    expect((await sendApi('DELETE', overrideUrl(past), { cookie: adminCookie })).status).toBe(422)
    expect(await readOverride(past)).toEqual(before)
    expect(
      (await sendApi('DELETE', overrideUrl('2026-02-30'), { cookie: adminCookie })).status,
    ).toBe(400)
    const tooFar = addDaysToIsoDate(parisDateFromToday(0), PRO_AVAILABILITY_HORIZON_DAYS + 1)
    expect((await sendApi('DELETE', overrideUrl(tooFar), { cookie: adminCookie })).status).toBe(400)
  })
})
