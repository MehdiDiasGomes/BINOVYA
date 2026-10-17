import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { BUSINESS_TIME_ZONE } from '../../../app/constants/booking'
import { isoDateInTimeZone } from '../../../app/utils/date'
import {
  createCustomer,
  openSession,
  seedAccountBooking,
  type AccountBookingSeed,
  sessionCookie,
  type AccountCustomer,
} from '../../support/account'
import { PARIS_ADDRESS, THIONVILLE_ADDRESS, UCKANGE_ADDRESS } from '../../support/address'
import { createAdmin, readDepot, removeE2eAdmins, type DepotRow } from '../../support/admin'
import { getApi } from '../../support/api'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { uniqueTestEmail } from '../../support/env'

import type { AddressDetails } from '../../../app/types/booking'
import type { ProPlanning } from '../../../app/types/pro'

const DAY = '2041-03-12'

const OTHER_DAY = '2041-03-13'

const EMPTY_DAY = '2041-03-14'

const THIONVILLE_SECOND: AddressDetails = {
  ...THIONVILLE_ADDRESS,
  label: '14 rue de la Gare, 57100 Thionville',
}

let cookie: string
let depot: DepotRow
let plan: ProPlanning
let ids: Record<string, string>

const planningOf = async (date?: string): Promise<ProPlanning> => {
  const query: string = date ? `?date=${date}` : ''
  const result = await getApi(`/api/pro/planning${query}`, cookie)
  expect(result.status).toBe(200)
  return result.body as unknown as ProPlanning
}

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  depot = await readDepot()
  const admin = await createAdmin(uniqueTestEmail('plan-admin'))
  cookie = sessionCookie((await openSession(admin.email)).raw)
  const customers: AccountCustomer[] = await Promise.all(
    ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(tag =>
      createCustomer({ email: uniqueTestEmail(`plan-${tag}`), firstName: tag.toUpperCase() }),
    ),
  )
  const [a, b, c, d, e, f, g] = customers as [AccountCustomer, ...AccountCustomer[]] & {
    length: 7
  }
  const seed = (
    customer: AccountCustomer,
    booking: Pick<AccountBookingSeed, 'status' | 'address'> & { date: string },
  ): Promise<string> =>
    seedAccountBooking({
      customerId: customer.id,
      status: booking.status,
      scheduledDate: booking.date,
      address: booking.address,
    })
  ids = {
    paris: await seed(a, { status: 'paid', date: DAY, address: PARIS_ADDRESS }),
    uckange: await seed(b, { status: 'paid', date: DAY, address: UCKANGE_ADDRESS }),
    thionvilleSecond: await seed(c, { status: 'completed', date: DAY, address: THIONVILLE_SECOND }),
    thionvilleFirst: await seed(d, { status: 'paid', date: DAY, address: THIONVILLE_ADDRESS }),
    cancelled: await seed(e, { status: 'cancelled', date: DAY }),
    pending: await seed(f, { status: 'pending_payment', date: DAY }),
    expired: await seed(g, { status: 'expired', date: DAY }),
    otherDay: await seed(a, { status: 'paid', date: OTHER_DAY }),
  }
  plan = await planningOf(DAY)
})

afterAll(async () => {
  await cleanupE2eData()
  await removeE2eAdmins()
})

describe('GET /api/pro/planning data', () => {
  it('returns the requested date and the depot of the booking settings', () => {
    expect(plan.date).toBe(DAY)
    expect(plan.depot).toEqual({
      latitude: depot.depot_latitude,
      longitude: depot.depot_longitude,
    })
  })

  it('lists only the paid and completed interventions of the day', () => {
    expect(plan.interventions.map(intervention => intervention.id).sort()).toEqual(
      [ids.paris, ids.uckange, ids.thionvilleSecond, ids.thionvilleFirst].sort(),
    )
  })

  it('never returns pending_payment, expired or cancelled bookings', () => {
    const statuses = plan.interventions.map(intervention => intervention.status)
    expect(statuses.filter(status => !['paid', 'completed'].includes(status))).toEqual([])
    const returned = plan.interventions.map(intervention => intervention.id)
    for (const id of [ids.pending, ids.expired, ids.cancelled]) {
      expect(returned).not.toContain(id)
    }
  })

  it('sorts by postcode, then by address', () => {
    expect(plan.interventions.map(intervention => intervention.id)).toEqual([
      ids.thionvilleFirst,
      ids.thionvilleSecond,
      ids.uckange,
      ids.paris,
    ])
  })

  it('returns the status, customer, address, coordinates and phone of each intervention', () => {
    const paid = plan.interventions.find(intervention => intervention.id === ids.thionvilleFirst)
    expect(paid).toMatchObject({
      status: 'paid',
      scheduledDate: DAY,
      address: THIONVILLE_ADDRESS.label,
      latitude: THIONVILLE_ADDRESS.latitude,
      longitude: THIONVILLE_ADDRESS.longitude,
      customer: { firstName: 'D', lastName: 'Compte', phone: '+33612345678' },
    })
    const done = plan.interventions.find(intervention => intervention.id === ids.thionvilleSecond)
    expect(done?.status).toBe('completed')
  })

  it('does not return the interventions of another day', () => {
    expect(plan.interventions.map(intervention => intervention.id)).not.toContain(ids.otherDay)
  })

  it('returns an empty list and the depot for a day without intervention', async () => {
    const empty = await planningOf(EMPTY_DAY)
    expect(empty.interventions).toEqual([])
    expect(empty.depot).not.toBeNull()
  })

  it('defaults to today in Paris', async () => {
    const today = await planningOf()
    expect(today.date).toBe(isoDateInTimeZone(new Date(), BUSINESS_TIME_ZONE))
  })
})
