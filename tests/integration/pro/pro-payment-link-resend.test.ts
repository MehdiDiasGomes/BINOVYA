import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  createCustomer,
  openSession,
  seedAccountBooking,
  sessionCookie,
} from '../../support/account'
import { createAdmin, removeE2eAdmins } from '../../support/admin'
import { sendApi, stripeClient, type ApiResult } from '../../support/api'
import { assertTestStripeKey, cleanupE2eData, readBookingStripe, rest } from '../../support/db'
import { uniqueTestEmail } from '../../support/env'
import { listMails, mailsAfterSettling, waitForMailCount } from '../../support/outbox'
import { FAR_RANGES, farDates, removeOverrides } from '../../support/pro'
import { createProBooking, proCreateBody, resendProPaymentLink } from '../../support/pro-create'

import type { ProCreateResponse } from '../../../app/types/proCreate'

const [DAY, OTHER_DAY] = farDates(FAR_RANGES.integrationProResend) as [string, string]

const RESEND_QUOTA = 3

let adminCookie = ''
let customerCookie = ''

const createLink = async (email: string, date: string = DAY): Promise<string> => {
  const result: ApiResult = await createProBooking(
    adminCookie,
    proCreateBody(date, { email, mode: 'payment_link' }),
  )
  expect(result.status).toBe(200)
  return (result.body as unknown as ProCreateResponse).bookingId
}

const readResendCount = async (bookingId: string): Promise<number> => {
  const response: Response = await rest(
    `/rest/v1/bookings?select=checkout_link_resend_count&id=eq.${bookingId}`,
  )
  const [row] = (await response.json()) as { checkout_link_resend_count: number }[]
  return row?.checkout_link_resend_count ?? -1
}

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  await removeOverrides([DAY, OTHER_DAY])
  const admin = await createAdmin(uniqueTestEmail('presend-admin'))
  const customer = await createCustomer({
    email: uniqueTestEmail('presend-cust'),
    firstName: 'Cliente',
  })
  adminCookie = sessionCookie((await openSession(admin.email)).raw)
  customerCookie = sessionCookie((await openSession(customer.email)).raw)
  await Promise.all(
    [DAY, OTHER_DAY].map(date =>
      sendApi('PUT', `/api/pro/availability/overrides/${date}`, {
        cookie: adminCookie,
        body: { maxBookings: 20, note: null },
      }),
    ),
  )
})

afterAll(async () => {
  await removeOverrides([DAY, OTHER_DAY])
  await cleanupE2eData()
  await removeE2eAdmins()
})

describe('POST /api/pro/bookings/[id]/payment-link access', () => {
  it('answers 401 without session and 403 to a customer', async () => {
    const bookingId = await createLink(uniqueTestEmail('presend-access'))
    expect((await resendProPaymentLink('', bookingId)).status).toBe(401)
    expect((await resendProPaymentLink(customerCookie, bookingId)).status).toBe(403)
    expect(await readResendCount(bookingId)).toBe(0)
  })

  it('answers 403 forbiddenOrigin with a foreign Origin', async () => {
    const bookingId = await createLink(uniqueTestEmail('presend-origin'))
    const result = await sendApi('POST', `/api/pro/bookings/${bookingId}/payment-link`, {
      cookie: adminCookie,
      origin: 'https://evil.example.com',
    })
    expect(result.status).toBe(403)
  })

  it('answers 404 for a malformed id and for an unknown booking', async () => {
    expect((await resendProPaymentLink(adminCookie, 'not-a-uuid')).status).toBe(404)
    expect((await resendProPaymentLink(adminCookie, crypto.randomUUID())).status).toBe(404)
  })

  it('answers 404 for a pending booking not created by an admin, without touching Stripe', async () => {
    const customer = await createCustomer({
      email: uniqueTestEmail('presend-online'),
      firstName: 'En ligne',
    })
    const bookingId = await seedAccountBooking({
      customerId: customer.id,
      status: 'pending_payment',
      scheduledDate: OTHER_DAY,
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      checkoutSessionId: 'cs_test_online',
    })
    const result = await resendProPaymentLink(adminCookie, bookingId)
    expect(result.status).toBe(404)
    expect(await readResendCount(bookingId)).toBe(0)
  })
})

describe('POST /api/pro/bookings/[id]/payment-link resends', () => {
  it('mails the open session URL again with a new key and limits to 3 per hour', async () => {
    const email = uniqueTestEmail('presend-quota')
    const bookingId = await createLink(email)
    const session = await stripeClient().checkout.sessions.retrieve(
      (await readBookingStripe(bookingId)).stripe_checkout_session_id ?? '',
    )
    const resends: ApiResult[] = await Array.from({ length: RESEND_QUOTA }).reduce<
      Promise<ApiResult[]>
    >(
      async previous => [...(await previous), await resendProPaymentLink(adminCookie, bookingId)],
      Promise.resolve([]),
    )
    resends.forEach(result => {
      expect(result.status).toBe(200)
      expect(result.body).toMatchObject({ bookingId })
    })
    const mails = await waitForMailCount(
      { to: email, subjectIncludes: 'finalisez le paiement' },
      RESEND_QUOTA + 1,
    )
    expect(mails).toHaveLength(RESEND_QUOTA + 1)
    expect(new Set(mails.map(mail => mail.idempotencyKey)).size).toBe(RESEND_QUOTA + 1)
    mails.forEach(mail => expect(mail.html).toContain(session.url?.replaceAll('&', '&amp;')))

    const fourth = await resendProPaymentLink(adminCookie, bookingId)
    expect(fourth.status).toBe(429)
    expect(fourth.body.data?.code).toBe('tooFrequent')
    expect(await readResendCount(bookingId)).toBe(RESEND_QUOTA)
    expect(
      await mailsAfterSettling({ to: email, subjectIncludes: 'finalisez le paiement' }),
    ).toHaveLength(RESEND_QUOTA + 1)
  })

  it('answers 409 linkUnavailable for a closed session and does not consume the quota', async () => {
    const stripe = stripeClient()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: { currency: 'eur', unit_amount: 1990, product_data: { name: 'Test' } },
        },
      ],
      success_url: 'https://example.com/ok',
    })
    await stripe.checkout.sessions.expire(session.id)
    const customer = await createCustomer({
      email: uniqueTestEmail('presend-closed'),
      firstName: 'Fermee',
    })
    const bookingId = await seedAccountBooking({
      customerId: customer.id,
      status: 'pending_payment',
      scheduledDate: OTHER_DAY,
      createdByAdmin: true,
      checkoutSessionId: session.id,
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    })
    const result = await resendProPaymentLink(adminCookie, bookingId)
    expect(result.status).toBe(409)
    expect(result.body.data?.code).toBe('linkUnavailable')
    expect(await readResendCount(bookingId)).toBe(0)
    expect((await listMails()).filter(mail => mail.to === customer.email)).toEqual([])
  })

  it('answers 422 notPending for a paid booking', async () => {
    const offline = await createProBooking(
      adminCookie,
      proCreateBody(OTHER_DAY, { email: uniqueTestEmail('presend-paid'), mode: 'offline' }),
    )
    const bookingId = (offline.body as unknown as ProCreateResponse).bookingId
    const result = await resendProPaymentLink(adminCookie, bookingId)
    expect(result.status).toBe(422)
    expect(result.body.data?.code).toBe('notPending')
  })
})
