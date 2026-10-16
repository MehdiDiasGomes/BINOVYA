import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  createCustomer,
  openSession,
  seedAccountBooking,
  seedPhoto,
  sessionCookie,
  type AccountCustomer,
} from '../../support/account'
import { assertTestStripeKey, cleanupE2eData, rest } from '../../support/db'
import { BASE_URL, uniqueTestEmail } from '../../support/env'

type OverviewBooking = {
  id: string
  scheduledDate: string
  status: string
  photos: { kind: string; url: string }[]
}

type Overview = {
  firstName: string
  deletionRequestedAt: string | null
  bookings: OverviewBooking[]
}

const getOverview = (cookie?: string): Promise<Response> =>
  fetch(`${BASE_URL}/api/account/bookings`, { headers: cookie ? { Cookie: cookie } : {} })

let owner: AccountCustomer
let stranger: AccountCustomer
let cookie: string
let ids: Record<string, string>

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  owner = await createCustomer({ email: uniqueTestEmail('owner'), firstName: 'Proprio' })
  stranger = await createCustomer({ email: uniqueTestEmail('stranger'), firstName: 'Autre' })
  ids = {
    completedOld: await seedAccountBooking({
      customerId: owner.id,
      status: 'completed',
      scheduledDate: '2026-09-01',
    }),
    paidFuture: await seedAccountBooking({
      customerId: owner.id,
      status: 'paid',
      scheduledDate: '2027-03-10',
    }),
    cancelledMid: await seedAccountBooking({
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
    paidOther: await seedAccountBooking({
      customerId: stranger.id,
      status: 'paid',
      scheduledDate: '2027-05-01',
    }),
    paidSameDayFirst: await seedAccountBooking({
      customerId: owner.id,
      status: 'paid',
      scheduledDate: '2027-02-01',
    }),
    paidSameDaySecond: await seedAccountBooking({
      customerId: owner.id,
      status: 'paid',
      scheduledDate: '2027-02-01',
    }),
  }
  await seedPhoto({ bookingId: ids.completedOld as string, kind: 'before' })
  await seedPhoto({ bookingId: ids.completedOld as string, kind: 'after' })
  await rest('/rest/v1/intervention_photos', {
    method: 'POST',
    body: JSON.stringify({
      booking_id: ids.paidFuture,
      kind: 'before',
      storage_path: `${ids.paidFuture}/before.png`,
    }),
  })
  cookie = sessionCookie((await openSession(owner.email)).raw)
})

afterAll(async () => {
  await cleanupE2eData()
})

describe('GET /api/account/bookings: authentication', () => {
  it('answers 401 without a session', async () => {
    expect((await getOverview()).status).toBe(401)
  })

  it('answers 401 with a garbage session cookie', async () => {
    expect((await getOverview('sb-x-auth-token=garbage')).status).toBe(401)
  })

  it('answers 401 with a forged bearer token and no cookie', async () => {
    const response = await fetch(`${BASE_URL}/api/account/bookings`, {
      headers: { Authorization: 'Bearer not.a.jwt' },
    })
    expect(response.status).toBe(401)
  })
})

describe('GET /api/account/bookings: with a session', () => {
  it('answers 200 with private, no-store caching', async () => {
    const response = await getOverview(cookie)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('returns the first name and no deletion request', async () => {
    const body = (await (await getOverview(cookie)).json()) as Overview
    expect(body.firstName).toBe('Proprio')
    expect(body.deletionRequestedAt).toBeNull()
  })

  it('returns only paid, completed and cancelled bookings of the customer', async () => {
    const body = (await (await getOverview(cookie)).json()) as Overview
    const returned = body.bookings.map(booking => booking.id)
    expect(returned).not.toContain(ids.pending)
    expect(returned).not.toContain(ids.expired)
    expect(returned).not.toContain(ids.paidOther)
    expect(new Set(returned)).toEqual(
      new Set([
        ids.completedOld,
        ids.paidFuture,
        ids.cancelledMid,
        ids.paidSameDayFirst,
        ids.paidSameDaySecond,
      ]),
    )
  })

  it('sorts by scheduled date descending, then creation date descending', async () => {
    const body = (await (await getOverview(cookie)).json()) as Overview
    expect(body.bookings.map(booking => booking.id)).toEqual([
      ids.paidFuture,
      ids.paidSameDaySecond,
      ids.paidSameDayFirst,
      ids.cancelledMid,
      ids.completedOld,
    ])
  })

  it('returns photos for the completed booking only, never for a paid one', async () => {
    const body = (await (await getOverview(cookie)).json()) as Overview
    const byId = new Map(body.bookings.map(booking => [booking.id, booking]))
    expect(
      byId
        .get(ids.completedOld as string)
        ?.photos.map(photo => photo.kind)
        .sort(),
    ).toEqual(['after', 'before'])
    expect(byId.get(ids.paidFuture as string)?.photos).toEqual([])
  })

  it('returns signed URLs that the browser can fetch as an image', async () => {
    const body = (await (await getOverview(cookie)).json()) as Overview
    const photo = body.bookings.find(booking => booking.id === ids.completedOld)?.photos[0]
    expect(photo?.url).toMatch(/\/storage\/v1\/object\/sign\/intervention-photos\/.+token=/)
    const image = await fetch(photo?.url ?? '')
    expect(image.status).toBe(200)
    expect(image.headers.get('content-type')).toContain('image/png')
  })

  it('signs URLs that live about 600 seconds', async () => {
    const body = (await (await getOverview(cookie)).json()) as Overview
    const url = body.bookings.find(booking => booking.id === ids.completedOld)?.photos[0]?.url
    const token = new URL(url ?? '').searchParams.get('token') ?? ''
    const claims = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString()) as {
      exp: number
      iat?: number
    }
    const remaining = claims.exp - Math.floor(Date.now() / 1000)
    expect(remaining).toBeGreaterThan(500)
    expect(remaining).toBeLessThanOrEqual(600)
  })

  it('never exposes another customer booking, even through the other customer session', async () => {
    const strangerCookie = sessionCookie((await openSession(stranger.email)).raw)
    const body = (await (await getOverview(strangerCookie)).json()) as Overview
    expect(body.firstName).toBe('Autre')
    expect(body.bookings.map(booking => booking.id)).toEqual([ids.paidOther])
  })
})
