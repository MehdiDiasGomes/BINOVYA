import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createCustomer, seedAccountBooking, type AccountCustomer } from '../../support/account'
import { releaseBooking } from '../../support/api'
import { assertTestStripeKey, cleanupE2eData, readBookingStripe } from '../../support/db'
import { uniqueTestEmail } from '../../support/env'
import { FAR_RANGES, farDates } from '../../support/pro'

const [DAY] = farDates(FAR_RANGES.integrationProRelease) as [string]

const HOUR_MS = 3_600_000

let customer: AccountCustomer

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  customer = await createCustomer({ email: uniqueTestEmail('release2'), firstName: 'Cliente' })
})

afterAll(async () => {
  await cleanupE2eData()
})

describe('POST /api/booking/release refusals', () => {
  it('refuses a booking created by the admin and leaves it pending', async () => {
    const bookingId = await seedAccountBooking({
      customerId: customer.id,
      status: 'pending_payment',
      scheduledDate: DAY,
      createdByAdmin: true,
      checkoutSessionId: 'cs_test_admin_release',
      expiresAt: new Date(Date.now() + HOUR_MS).toISOString(),
    })
    const result = await releaseBooking(bookingId)
    expect(result.status).toBe(200)
    expect(result.body.isReleased).toBe(false)
    expect((await readBookingStripe(bookingId)).status).toBe('pending_payment')
  })

  it('refuses an online booking whose hold already ended', async () => {
    const bookingId = await seedAccountBooking({
      customerId: customer.id,
      status: 'pending_payment',
      scheduledDate: DAY,
      checkoutSessionId: 'cs_test_late_release',
      expiresAt: new Date(Date.now() - HOUR_MS).toISOString(),
    })
    const result = await releaseBooking(bookingId)
    expect(result.status).toBe(200)
    expect(result.body.isReleased).toBe(false)
    expect((await readBookingStripe(bookingId)).status).toBe('pending_payment')
  })

  it('refuses a paid booking', async () => {
    const bookingId = await seedAccountBooking({
      customerId: customer.id,
      status: 'paid',
      scheduledDate: DAY,
      checkoutSessionId: 'cs_test_paid_release',
    })
    expect((await releaseBooking(bookingId)).body.isReleased).toBe(false)
    expect((await readBookingStripe(bookingId)).status).toBe('paid')
  })
})
