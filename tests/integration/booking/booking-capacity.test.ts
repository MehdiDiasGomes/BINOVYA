import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  type ApiResult,
  createBooking,
  DAY_CAPACITY,
  fillDay,
  newPendingBooking,
  THIONVILLE_ADDRESS,
} from '../../support/api'
import { pickFreeDates } from '../../support/dates'
import {
  assertTestStripeKey,
  cleanupE2eData,
  countActiveBookings,
  findBookings,
} from '../../support/db'
import { uniqueTestEmail } from '../../support/env'

const RACE_DAYS: number = 3
const RACE_ATTEMPTS: number = 5
const OTHER_TESTS_DAYS: number = 3

const CATTENOM_ADDRESS: Record<string, unknown> = {
  ...THIONVILLE_ADDRESS,
  label: 'Rue de la Gare, 57570 Cattenom',
  city: 'Cattenom',
  postcode: '57570',
  latitude: 49.4157,
  longitude: 6.2339,
}

const WOIPPY_ADDRESS: Record<string, unknown> = {
  ...THIONVILLE_ADDRESS,
  label: 'Rue de Metz, 57140 Woippy',
  city: 'Woippy',
  postcode: '57140',
  latitude: 49.151,
  longitude: 6.151,
}

let days: string[] = []

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  days = await pickFreeDates(OTHER_TESTS_DAYS + RACE_DAYS)
})

afterAll(async () => {
  await cleanupE2eData()
})

const raceForLastPlace = async (date: string, index: number): Promise<ApiResult[]> => {
  await Promise.all(
    Array.from({ length: DAY_CAPACITY - 1 }, (_unused: unknown, fill: number) =>
      newPendingBooking(`cap-race${index}-fill${fill}`, date),
    ),
  )
  return Promise.all(
    Array.from({ length: RACE_ATTEMPTS }, (_unused: unknown, attempt: number) =>
      createBooking({ email: uniqueTestEmail(`cap-race${index}-${attempt}`), date }),
    ),
  )
}

describe('POST /api/booking capacity', () => {
  it('refuses a booking on a full day with 409 dayTaken and creates no row', async () => {
    const date: string = days[0] ?? ''
    await fillDay(date, 'cap-full')
    const email: string = uniqueTestEmail('cap-full-extra')
    const result: ApiResult = await createBooking({ email, date })
    expect(result.status).toBe(409)
    expect(result.body.data?.code).toBe('dayTaken')
    expect(await findBookings(email)).toHaveLength(0)
    expect(await countActiveBookings(date)).toBe(DAY_CAPACITY)
  })

  it('refuses an address more than 15 km from the first booking of the day, accepts it another day', async () => {
    const date: string = days[1] ?? ''
    await newPendingBooking('cap-sector-a', date, uniqueTestEmail('cap-sector-a'))
    const refusedEmail: string = uniqueTestEmail('cap-sector-b')
    const refused: ApiResult = await createBooking({
      email: refusedEmail,
      date,
      address: WOIPPY_ADDRESS,
    })
    expect(refused.status).toBe(409)
    expect(refused.body.data?.code).toBe('dayTaken')
    expect(await findBookings(refusedEmail)).toHaveLength(0)

    const northEmail: string = uniqueTestEmail('cap-sector-n')
    const sameSector: ApiResult = await createBooking({
      email: northEmail,
      date,
      address: CATTENOM_ADDRESS,
    })
    expect(sameSector.status).toBe(200)

    const otherDay: ApiResult = await createBooking({
      email: uniqueTestEmail('cap-sector-ok'),
      date: days[2] ?? '',
      address: WOIPPY_ADDRESS,
    })
    expect(otherDay.status).toBe(200)
  })

  it('lets exactly one of five simultaneous requests take the last place of each day', async () => {
    const raceDays: string[] = days.slice(OTHER_TESTS_DAYS)
    const outcomes: ApiResult[][] = await Promise.all(
      raceDays.map((date: string, index: number) => raceForLastPlace(date, index)),
    )
    for (const [index, results] of outcomes.entries()) {
      const refused: ApiResult[] = results.filter(result => result.status === 409)
      expect(results.filter(result => result.status === 200)).toHaveLength(1)
      expect(refused).toHaveLength(RACE_ATTEMPTS - 1)
      expect(refused.every(result => result.body.data?.code === 'dayTaken')).toBe(true)
      expect(await countActiveBookings(raceDays[index] ?? '')).toBe(DAY_CAPACITY)
    }
  })
})
