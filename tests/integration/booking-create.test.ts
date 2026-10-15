import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { pickFreeDates } from '../support/dates'
import { assertTestStripeKey, cleanupE2eData, findBookings } from '../support/db'
import {
  bookingBody,
  createBooking,
  newEmail,
  PARIS_ADDRESS,
  postJson,
  releaseBooking,
} from './support/api'

let days: string[] = []

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  days = await pickFreeDates(5)
})

afterAll(async () => {
  await cleanupE2eData()
})

describe('POST /api/booking', () => {
  it('rejects an invalid body with 400', async () => {
    const result = await postJson('/api/booking', { plan: 'one_off' })
    expect(result.status).toBe(400)
  })

  it('rejects a malformed JSON body with 400', async () => {
    const result = await postJson('/api/booking', '{not json')
    expect(result.status).toBe(400)
  })

  it('rejects an oversized body with 413', async () => {
    const body = { ...bookingBody(), website: 'x'.repeat(20_000) }
    const result = await postJson('/api/booking', body)
    expect(result.status).toBe(413)
  })

  it.each(['2026-02-30', '2026-13-01', '2027-02-29'])(
    'rejects the impossible date %s with 400',
    async date => {
      const email = newEmail('baddate')
      const result = await createBooking({ email, date })
      expect(result.status).toBe(400)
      expect(await findBookings(email)).toHaveLength(0)
    },
  )

  it('rejects a Luxembourg postcode with 5 digits with 400', async () => {
    const result = await createBooking({
      address: { ...(bookingBody().address as object), countryCode: 'LU', postcode: '57100' },
    })
    expect(result.status).toBe(400)
  })

  it('rejects an unconfirmed bins checkbox with 400', async () => {
    const result = await postJson('/api/booking', { ...bookingBody(), binsReadyConfirmed: false })
    expect(result.status).toBe(400)
  })

  it('rejects an address outside the service area with 422 outOfArea', async () => {
    const email = newEmail('area')
    const result = await createBooking({ email, address: PARIS_ADDRESS, date: days[0] })
    expect(result.status).toBe(422)
    expect(result.body.data?.code).toBe('outOfArea')
    expect(await findBookings(email)).toHaveLength(0)
  })

  it('rejects a bin combination without price with 422 quoteRequired', async () => {
    const email = newEmail('quote')
    const result = await createBooking({
      email,
      smallBinCount: 10,
      largeBinCount: 10,
      date: days[0],
    })
    expect(result.status).toBe(422)
    expect(result.body.data?.code).toBe('quoteRequired')
    expect(await findBookings(email)).toHaveLength(0)
  })

  it('does not leak internal error messages on a business rejection', async () => {
    const result = await createBooking({ address: PARIS_ADDRESS, date: days[0] })
    expect(result.raw).not.toMatch(/create_booking|OUT_OF_AREA|postgres|supabase/i)
  })

  it('answers a filled honeypot with a fake 200 and creates no row', async () => {
    const email = newEmail('honeypot')
    const result = await createBooking({
      email,
      website: 'https://spam.example',
      date: days[0],
    })
    expect(result.status).toBe(200)
    expect(result.body.amountTotalCents).toBe(0)
    expect(String(result.body.checkoutUrl)).toContain('/booking?checkout=cancelled')
    expect(await findBookings(email)).toHaveLength(0)
  })

  it('creates a pending booking and returns a Stripe Checkout URL', async () => {
    const email = newEmail('valid')
    const result = await createBooking({ email, date: days[0] })
    expect(result.status).toBe(200)
    expect(String(result.body.checkoutUrl)).toMatch(/^https:\/\/checkout\.stripe\.com\//)
    expect(result.body.amountTotalCents).toBeGreaterThan(0)

    const [row] = await findBookings(email)
    expect(row?.status).toBe('pending_payment')
    expect(row?.id).toBe(result.body.bookingId)
    expect(row?.amount_total_cents).toBe(result.body.amountTotalCents)
    expect(row?.stripe_checkout_session_id).toMatch(/^cs_test_/)
    expect(row?.stripe_payment_intent_id).toBeNull()
  })

  it('rejects a second booking of the same email while the first is pending with 409 pendingPayment', async () => {
    const email = newEmail('pending')
    const first = await createBooking({ email, date: days[1] })
    expect(first.status).toBe(200)

    const second = await createBooking({ email, date: days[2] })
    expect(second.status).toBe(409)
    expect(second.body.data?.code).toBe('pendingPayment')
    expect(await findBookings(email)).toHaveLength(1)
  })
})

describe('POST /api/booking/release', () => {
  it('rejects a body that is not a uuid with 400', async () => {
    const result = await postJson('/api/booking/release', { bookingId: 'nope' })
    expect(result.status).toBe(400)
  })

  it('answers isReleased false for an unknown uuid', async () => {
    const result = await releaseBooking('3f2b8c1e-5d4a-4c7e-9b1a-2e6f8d0a1c3b')
    expect(result.status).toBe(200)
    expect(result.body.isReleased).toBe(false)
  })

  it('releases a pending booking, then accepts a new booking with the same email', async () => {
    const email = newEmail('release')
    const first = await createBooking({ email, date: days[3] })
    expect(first.status).toBe(200)
    const bookingId = String(first.body.bookingId)

    const released = await releaseBooking(bookingId)
    expect(released.status).toBe(200)
    expect(released.body.isReleased).toBe(true)
    expect((await findBookings(email))[0]?.status).toBe('expired')

    const again = await releaseBooking(bookingId)
    expect(again.body.isReleased).toBe(false)

    const second = await createBooking({ email, date: days[3] })
    expect(second.status).toBe(200)
    const rows = await findBookings(email)
    expect(rows.map(row => row.status)).toEqual(['expired', 'pending_payment'])
  })
})
