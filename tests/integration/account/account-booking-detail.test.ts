import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  createCustomer,
  openPasswordSession,
  openSession,
  seedAccountBooking,
  sessionCookie,
  type AccountCustomer,
} from '../../support/account'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { BASE_URL, uniqueTestEmail } from '../../support/env'

type Result = { status: number; cacheControl: string | null; text: string }

const MISSING_ID = '00000000-0000-4000-8000-000000000000'

let owner: AccountCustomer
let stranger: AccountCustomer
let cookie: string
let ids: Record<string, string>

const withoutRequestUrl = (text: string): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(JSON.parse(text) as Record<string, unknown>).filter(([key]) => key !== 'url'),
  )

const getDetail = async (id: string, sessionCookieHeader?: string): Promise<Result> => {
  const response = await fetch(`${BASE_URL}/api/account/bookings/${id}`, {
    headers: sessionCookieHeader ? { Cookie: sessionCookieHeader } : {},
  })
  return {
    status: response.status,
    cacheControl: response.headers.get('cache-control'),
    text: await response.text(),
  }
}

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  owner = await createCustomer({ email: uniqueTestEmail('detail-owner'), firstName: 'Proprio' })
  stranger = await createCustomer({ email: uniqueTestEmail('detail-other'), firstName: 'Autre' })
  ids = {
    paid: await seedAccountBooking({
      customerId: owner.id,
      status: 'paid',
      scheduledDate: '2027-03-10',
    }),
    completed: await seedAccountBooking({
      customerId: owner.id,
      status: 'completed',
      scheduledDate: '2026-09-01',
    }),
    cancelled: await seedAccountBooking({
      customerId: owner.id,
      status: 'cancelled',
      scheduledDate: '2026-12-01',
    }),
    pending: await seedAccountBooking({
      customerId: owner.id,
      status: 'pending_payment',
      scheduledDate: '2027-04-01',
    }),
    expired: await seedAccountBooking({
      customerId: owner.id,
      status: 'expired',
      scheduledDate: '2027-04-02',
    }),
    other: await seedAccountBooking({
      customerId: stranger.id,
      status: 'paid',
      scheduledDate: '2027-05-01',
    }),
  }
  cookie = sessionCookie((await openSession(owner.email)).raw)
})

afterAll(async () => {
  await cleanupE2eData()
})

describe('GET /api/account/bookings/[id]: own booking', () => {
  it('answers 200 with private, no-store caching and the booking', async () => {
    const result = await getDetail(ids.paid as string, cookie)
    expect(result.status).toBe(200)
    expect(result.cacheControl).toBe('private, no-store')
    expect(JSON.parse(result.text)).toEqual({
      booking: {
        id: ids.paid,
        scheduledDate: '2027-03-10',
        address: '12 rue de la Gare, 57100 Thionville',
        plan: 'one_off',
        smallBinCount: 1,
        largeBinCount: 0,
        amountTotalCents: 1990,
        status: 'paid',
      },
      documents: { photos: { before: null, after: null }, receiptUrl: null },
    })
  })

  it.each(['completed', 'cancelled'])('answers 200 for a %s booking', async key => {
    const result = await getDetail(ids[key] as string, cookie)
    expect(result.status).toBe(200)
    expect((JSON.parse(result.text) as { booking: { status: string } }).booking.status).toBe(key)
  })

  it('never returns a photos property', async () => {
    const result = await getDetail(ids.completed as string, cookie)
    expect(JSON.parse(result.text).booking).not.toHaveProperty('photos')
  })
})

describe('GET /api/account/bookings/[id]: not found', () => {
  it('answers 404 for another customer booking, with the same body as an unknown uuid', async () => {
    const foreign = await getDetail(ids.other as string, cookie)
    const unknown = await getDetail(MISSING_ID, cookie)
    expect(foreign.status).toBe(404)
    expect(unknown.status).toBe(404)
    expect(withoutRequestUrl(foreign.text)).toEqual(withoutRequestUrl(unknown.text))
  })

  it.each(['pending', 'expired'])('answers 404 for a %s booking of the customer', async key => {
    const result = await getDetail(ids[key] as string, cookie)
    expect(result.status).toBe(404)
    expect((JSON.parse(result.text) as { statusMessage: string }).statusMessage).toBe(
      'Booking not found',
    )
  })

  it('does not let the other customer read the first customer booking', async () => {
    const strangerCookie = sessionCookie((await openSession(stranger.email)).raw)
    expect((await getDetail(ids.paid as string, strangerCookie)).status).toBe(404)
    expect((await getDetail(ids.other as string, strangerCookie)).status).toBe(200)
  })
})

describe('GET /api/account/bookings/[id]: invalid id', () => {
  it.each(['not-a-uuid', '12345', `${MISSING_ID}0`])('answers 400 for the id %s', async id => {
    const result = await getDetail(id, cookie)
    expect(result.status).toBe(400)
    expect((JSON.parse(result.text) as { statusMessage: string }).statusMessage).toBe(
      'Invalid booking id',
    )
  })
})

describe('GET /api/account/bookings/[id]: authentication', () => {
  it('answers 401 without a session', async () => {
    expect((await getDetail(ids.paid as string)).status).toBe(401)
  })

  it('answers 401 before validating the id when there is no session', async () => {
    expect((await getDetail('not-a-uuid')).status).toBe(401)
  })

  it('answers 401 with a garbage session cookie', async () => {
    expect((await getDetail(ids.paid as string, 'sb-x-auth-token=garbage')).status).toBe(401)
  })

  it('answers 401 with a session that has no recent otp or magiclink sign-in', async () => {
    const stale = await openPasswordSession(owner.id, owner.email)
    expect((await getDetail(ids.paid as string, sessionCookie(stale.raw))).status).toBe(401)
    expect((await getDetail('not-a-uuid', sessionCookie(stale.raw))).status).toBe(401)
  })

  it('still sends no-store on a 401', async () => {
    expect((await getDetail(ids.paid as string)).cacheControl).toBe('private, no-store')
  })
})
