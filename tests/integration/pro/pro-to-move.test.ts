import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { WEEKDAYS_MONDAY_FIRST } from '../../../app/constants/booking'
import { addDaysToIsoDate, parseIsoDate } from '../../../app/utils/date'
import {
  createCustomer,
  openSession,
  seedAccountBooking,
  sessionCookie,
  type AccountBookingSeed,
} from '../../support/account'
import { createAdmin, removeE2eAdmins } from '../../support/admin'
import { getApi, sendApi, type ApiResult } from '../../support/api'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { uniqueTestEmail } from '../../support/env'
import { FAR_RANGES, farDates, readRules, removeOverrides } from '../../support/pro'

import type { ProInterventionsPage, ProPlanning } from '../../../app/types/pro'
import type { ProAvailability, ProDayOverview } from '../../../app/types/proAvailability'

const DATES = farDates(FAR_RANGES.toMove)

const [BLOCKED_DAY, SHRUNK_DAY, MIXED_DAY, REOPENED_DAY, RULE_DAY] = DATES as [
  string,
  string,
  string,
  string,
  string,
  string,
]

let adminCookie: string
let customerId: string

const overrideUrl = (date: string): string => `/api/pro/availability/overrides/${date}`

const setCapacity = (date: string, maxBookings: number): Promise<ApiResult> =>
  sendApi('PUT', overrideUrl(date), { cookie: adminCookie, body: { maxBookings, note: null } })

const seed = (date: string, status: AccountBookingSeed['status']): Promise<string> =>
  seedAccountBooking({ customerId, status, scheduledDate: date })

const planningOf = async (date: string): Promise<ProPlanning> => {
  const result = await getApi(`/api/pro/planning?date=${date}`, adminCookie)
  expect(result.status).toBe(200)
  return result.body as unknown as ProPlanning
}

const listOf = async (date: string): Promise<ProInterventionsPage> => {
  const result = await getApi(
    `/api/pro/interventions?status=all&from=${date}&to=${date}`,
    adminCookie,
  )
  expect(result.status).toBe(200)
  return result.body as unknown as ProInterventionsPage
}

const flagsOf = (interventions: { id: string; isToMove: boolean }[]): Record<string, boolean> =>
  Object.fromEntries(interventions.map(entry => [entry.id, entry.isToMove]))

const availabilityOf = async (date: string): Promise<ProDayOverview | undefined> => {
  const result = await getApi(`/api/pro/availability?from=${date}&to=${date}`, adminCookie)
  return (result.body as unknown as ProAvailability).days[0]
}

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  await removeOverrides(DATES)
  const admin = await createAdmin(uniqueTestEmail('tomove-admin'))
  adminCookie = sessionCookie((await openSession(admin.email)).raw)
  customerId = (await createCustomer({ email: uniqueTestEmail('tomove-cust'), firstName: 'Dep' }))
    .id
})

afterAll(async () => {
  await removeOverrides(DATES)
  await cleanupE2eData()
  await removeE2eAdmins()
})

describe('interventions to move after an exception that closes their day', () => {
  let paid: string
  let completed: string
  let cancelled: string

  beforeAll(async () => {
    await setCapacity(BLOCKED_DAY, 3)
    paid = await seed(BLOCKED_DAY, 'paid')
    completed = await seed(BLOCKED_DAY, 'completed')
    cancelled = await seed(BLOCKED_DAY, 'cancelled')
  })

  it('flags nothing while the day is open', async () => {
    const planning = await planningOf(BLOCKED_DAY)
    expect(planning.day?.isClosed).toBe(false)
    expect(planning.interventions.every(entry => !entry.isToMove)).toBe(true)
    const list = await listOf(BLOCKED_DAY)
    expect(list.interventions.every(entry => !entry.isToMove)).toBe(true)
  })

  it('flags the paid intervention in the planning once the day is blocked', async () => {
    expect((await setCapacity(BLOCKED_DAY, 0)).status).toBe(200)
    const planning = await planningOf(BLOCKED_DAY)
    expect(planning.day).toMatchObject({ isClosed: true, capacity: 0, paidCount: 1 })
    expect(flagsOf(planning.interventions)).toEqual({ [paid]: true, [completed]: false })
  })

  it('flags it in the interventions list too, and never a completed or cancelled one', async () => {
    const list = await listOf(BLOCKED_DAY)
    expect(flagsOf(list.interventions)).toEqual({
      [paid]: true,
      [completed]: false,
      [cancelled]: false,
    })
  })

  it('lists the blocked day among the days to watch', async () => {
    const day = await availabilityOf(BLOCKED_DAY)
    expect(day).toMatchObject({ date: BLOCKED_DAY, isClosed: true, paidCount: 1 })
  })

  it('clears the flag once the day is reopened', async () => {
    await setCapacity(BLOCKED_DAY, 3)
    const planning = await planningOf(BLOCKED_DAY)
    expect(planning.interventions.every(entry => !entry.isToMove)).toBe(true)
  })
})

describe('a day shrunk below its bookings', () => {
  let first: string
  let second: string

  beforeAll(async () => {
    await setCapacity(SHRUNK_DAY, 3)
    first = await seed(SHRUNK_DAY, 'paid')
    second = await seed(SHRUNK_DAY, 'paid')
  })

  it('flags no intervention but reports the day over capacity', async () => {
    await setCapacity(SHRUNK_DAY, 1)
    const planning = await planningOf(SHRUNK_DAY)
    expect(planning.day).toMatchObject({ capacity: 1, activeCount: 2, isClosed: false })
    expect(flagsOf(planning.interventions)).toEqual({ [first]: false, [second]: false })
    expect(flagsOf((await listOf(SHRUNK_DAY)).interventions)).toEqual({
      [first]: false,
      [second]: false,
    })
    expect(await availabilityOf(SHRUNK_DAY)).toMatchObject({
      date: SHRUNK_DAY,
      capacity: 1,
      activeCount: 2,
    })
  })

  it('flags both interventions once the day is closed', async () => {
    await setCapacity(SHRUNK_DAY, 0)
    const planning = await planningOf(SHRUNK_DAY)
    expect(flagsOf(planning.interventions)).toEqual({ [first]: true, [second]: true })
  })
})

describe('flags are decided day by day', () => {
  it('flags only the paid intervention of the closed day in a list covering two days', async () => {
    await setCapacity(MIXED_DAY, 0)
    await setCapacity(REOPENED_DAY, 3)
    const closedBooking = await seed(MIXED_DAY, 'paid')
    const openBooking = await seed(REOPENED_DAY, 'paid')
    const result = await getApi(
      `/api/pro/interventions?status=paid&from=${MIXED_DAY}&to=${REOPENED_DAY}`,
      adminCookie,
    )
    const list = result.body as unknown as ProInterventionsPage
    expect(flagsOf(list.interventions)).toEqual({ [closedBooking]: true, [openBooking]: false })
  })

  it('flags a paid intervention on a day closed by its weekday rule, without any exception', async () => {
    const rules = await readRules()
    const closedWeekday = rules.find(rule => rule.maxBookings === 0)
    expect(closedWeekday).toBeDefined()
    const date = WEEKDAYS_MONDAY_FIRST.map(offset => addDaysToIsoDate(RULE_DAY, offset)).find(
      candidate => parseIsoDate(candidate).getDay() === closedWeekday?.weekday,
    )
    expect(date).toBeDefined()
    const booking = await seed(date as string, 'paid')
    const planning = await planningOf(date as string)
    expect(planning.day).toMatchObject({ isClosed: true, capacitySource: 'rule' })
    expect(flagsOf(planning.interventions)).toEqual({ [booking]: true })
  })
})
