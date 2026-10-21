import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  createCustomer,
  countAuthUsersByEmail,
  openSession,
  sessionCookie,
} from '../../support/account'
import { createAdmin, removeE2eAdmins } from '../../support/admin'
import { stripeClient, sendApi, type ApiResult } from '../../support/api'
import {
  assertTestStripeKey,
  cleanupE2eData,
  findBookings,
  readAdminBooking,
  readBookingStripe,
  rest,
} from '../../support/db'
import { uniqueTestEmail } from '../../support/env'
import { mailsAfterSettling, waitForOneMail } from '../../support/outbox'
import { FAR_RANGES, farDates, removeOverrides } from '../../support/pro'
import { createProBooking, proCreateBody } from '../../support/pro-create'

import type { ProCreateResponse } from '../../../app/types/proCreate'

const [DAY, CLOSED_DAY, QUOTE_DAY] = farDates(FAR_RANGES.integrationProCreateReplay) as [
  string,
  string,
  string,
]

const QUOTE_CENTS = 12_345

let adminCookie = ''

const create = (overrides: Parameters<typeof proCreateBody>[1] = {}): Promise<ApiResult> =>
  createProBooking(adminCookie, proCreateBody(DAY, overrides))

const asResponse = (result: ApiResult): ProCreateResponse =>
  result.body as unknown as ProCreateResponse

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  await removeOverrides([DAY, CLOSED_DAY, QUOTE_DAY])
  const admin = await createAdmin(uniqueTestEmail('preplay-admin'))
  adminCookie = sessionCookie((await openSession(admin.email)).raw)
  await Promise.all(
    [DAY, CLOSED_DAY, QUOTE_DAY].map(date =>
      sendApi('PUT', `/api/pro/availability/overrides/${date}`, {
        cookie: adminCookie,
        body: { maxBookings: date === CLOSED_DAY ? 0 : 40, note: null },
      }),
    ),
  )
})

afterAll(async () => {
  await removeOverrides([DAY, CLOSED_DAY, QUOTE_DAY])
  await cleanupE2eData()
  await removeE2eAdmins()
})

describe('a quote priced intervention', () => {
  it('stores the quote price, the bins up to 50 and the note, and sends the confirmation', async () => {
    const email = uniqueTestEmail('pquote')
    const result = await createProBooking(
      adminCookie,
      proCreateBody(QUOTE_DAY, {
        email,
        smallBinCount: 7,
        largeBinCount: 50,
        quoteAmountCents: QUOTE_CENTS,
        note: '  Code portail 1234  ',
      }),
    )
    expect(result.status).toBe(200)
    const created = asResponse(result)
    expect(created.amountTotalCents).toBe(QUOTE_CENTS)
    expect(await readAdminBooking(created.bookingId)).toMatchObject({
      price_source: 'quote',
      small_bin_count: 7,
      large_bin_count: 50,
      amount_total_cents: QUOTE_CENTS,
      admin_note: 'Code portail 1234',
      payment_method: 'offline',
    })
    await waitForOneMail({ to: email, subjectIncludes: 'est confirmée' })
  })

  it('accepts 1 cent and 1 000 000 cents', async () => {
    expect((await create({ quoteAmountCents: 1 })).status).toBe(200)
    expect((await create({ quoteAmountCents: 1_000_000 })).status).toBe(200)
  })

  it.each([0, 1_000_001, -5, 10.5])(
    'answers 400 invalidQuoteAmount for %j and creates nothing',
    async quoteAmountCents => {
      const email = uniqueTestEmail('pquote-bad')
      const result = await create({ email, quoteAmountCents })
      expect(result.status).toBe(400)
      expect(result.body.data?.code).toBe('invalidQuoteAmount')
      expect(await findBookings(email)).toEqual([])
    },
  )

  it('answers 400 invalidInput for 51 bins, even forced', async () => {
    const email = uniqueTestEmail('pquote-51')
    const result = await create({ email, smallBinCount: 51, quoteAmountCents: 5000, force: true })
    expect(result.status).toBe(400)
    expect(result.body.data?.code).toBe('invalidInput')
    expect(await findBookings(email)).toEqual([])
  })

  it('answers 400 invalidQuantities for no bin at all in quote mode', async () => {
    const email = uniqueTestEmail('pquote-0')
    const result = await create({
      email,
      smallBinCount: 0,
      largeBinCount: 0,
      quoteAmountCents: 5000,
      force: true,
    })
    expect(result.status).toBe(400)
    expect(result.body.data?.code).toBe('invalidQuantities')
    expect(await findBookings(email)).toEqual([])
  })

  it('answers 400 invalidInput for a note over 500 characters', async () => {
    const result = await create({ note: 'x'.repeat(501) })
    expect(result.status).toBe(400)
    expect(result.body.data?.code).toBe('invalidInput')
  })
})

describe('an offline intervention', () => {
  it('is paid at once, without Stripe ids, with only the confirmation mail', async () => {
    const email = uniqueTestEmail('poffline')
    const created = asResponse(await create({ email, mode: 'offline' }))
    expect(await readBookingStripe(created.bookingId)).toMatchObject({
      status: 'paid',
      payment_method: 'offline',
      created_by_admin: true,
      stripe_checkout_session_id: null,
      stripe_payment_intent_id: null,
      stripe_invoice_id: null,
      expires_at: null,
    })
    await waitForOneMail({ to: email, subjectIncludes: 'est confirmée' })
    expect(await mailsAfterSettling({ to: email, subjectIncludes: 'finalisez' })).toEqual([])
  })
})

describe('replaying the same request id', () => {
  it('returns the same offline booking flagged as a replay and sends no second mail', async () => {
    const email = uniqueTestEmail('preplay-off')
    const body = proCreateBody(DAY, { email, mode: 'offline' })
    const first = asResponse(await createProBooking(adminCookie, body))
    await waitForOneMail({ to: email, subjectIncludes: 'est confirmée' })
    const again = await createProBooking(adminCookie, body)
    expect(again.status).toBe(200)
    expect(asResponse(again)).toMatchObject({ bookingId: first.bookingId, isReplay: true })
    expect(first.isReplay).toBe(false)
    expect(await findBookings(email)).toHaveLength(1)
    expect((await mailsAfterSettling({ to: email, subjectIncludes: 'est confirmée' })).length).toBe(
      1,
    )
  })

  it('creates a single booking and a single mail out of 6 simultaneous identical requests', async () => {
    const email = uniqueTestEmail('preplay-race')
    const body = proCreateBody(DAY, { email, mode: 'offline' })
    const answers = await Promise.all(
      Array.from({ length: 6 }, () => createProBooking(adminCookie, body)),
    )
    const bookingIds = new Set(
      answers.filter(answer => answer.status === 200).map(answer => asResponse(answer).bookingId),
    )
    expect(bookingIds.size).toBe(1)
    expect(
      answers.filter(answer => answer.status === 200 && !asResponse(answer).isReplay),
    ).toHaveLength(1)
    expect(await findBookings(email)).toHaveLength(1)
    expect((await mailsAfterSettling({ to: email, subjectIncludes: 'est confirmée' })).length).toBe(
      1,
    )
  })

  it('returns the payment link booking once its session is open, without a second mail', async () => {
    const email = uniqueTestEmail('preplay-link')
    const body = proCreateBody(DAY, { email, mode: 'payment_link' })
    const first = asResponse(await createProBooking(adminCookie, body))
    await waitForOneMail({ to: email, subjectIncludes: 'finalisez le paiement' })
    const again = await createProBooking(adminCookie, body)
    expect(again.status).toBe(200)
    expect(asResponse(again)).toMatchObject({ bookingId: first.bookingId, isReplay: true })
    expect(
      (await mailsAfterSettling({ to: email, subjectIncludes: 'finalisez le paiement' })).length,
    ).toBe(1)
  })

  it('answers 400 invalidInput for another email and creates no profile nor auth user', async () => {
    const email = uniqueTestEmail('preplay-a')
    const other = uniqueTestEmail('preplay-b')
    const requestId = crypto.randomUUID()
    expect((await create({ email, requestId })).status).toBe(200)
    const result = await create({ email: other, requestId })
    expect(result.status).toBe(400)
    expect(result.body.data?.code).toBe('invalidInput')
    expect(await countAuthUsersByEmail(other)).toBe(0)
    const profiles = await rest(`/rest/v1/profiles?select=id&email=eq.${encodeURIComponent(other)}`)
    expect(await profiles.json()).toEqual([])
  })

  it('treats the same address typed in another case or with spaces as the same customer', async () => {
    const email = uniqueTestEmail('preplay-case')
    const requestId = crypto.randomUUID()
    const first = asResponse(await create({ email, requestId }))
    const again = await create({ email: `  ${email.toUpperCase()} `, requestId })
    expect(again.status).toBe(200)
    expect(asResponse(again).bookingId).toBe(first.bookingId)
  })

  it('does not create a second account for an existing customer typed in upper case', async () => {
    const email = uniqueTestEmail('preplay-existing')
    await createCustomer({ email, firstName: 'Deja' })
    expect((await create({ email: ` ${email.toUpperCase()}` })).status).toBe(200)
    expect(await countAuthUsersByEmail(email)).toBe(1)
  })
})

describe('the Stripe session of a payment link booking', () => {
  it('puts the intervention address in the invoice description and enables an invoice on payment', async () => {
    const email = uniqueTestEmail('plink-session')
    const created = asResponse(await create({ email, mode: 'payment_link' }))
    const row = await readBookingStripe(created.bookingId)
    const stripe = stripeClient()
    const session = await stripe.checkout.sessions.retrieve(row.stripe_checkout_session_id ?? '')
    expect(session.invoice_creation?.invoice_data?.description).toContain('Thionville')
    expect(session.invoice_creation?.enabled).toBe(true)
    expect(session.cancel_url).toContain('/payment-link')
    expect(session.customer).toMatch(/^cus_/)
    const customer = await stripe.customers.retrieve(session.customer as string)
    expect('address' in customer ? customer.address : null).toBeNull()
    expect(customer.deleted).not.toBe(true)
  })

  it('answers 409 customerPending for a second link while the first is open', async () => {
    const email = uniqueTestEmail('plink-pending')
    expect((await create({ email, mode: 'payment_link' })).status).toBe(200)
    const second = await create({ email, mode: 'payment_link' })
    expect(second.status).toBe(409)
    expect(second.body.data?.code).toBe('customerPending')
  })

  it('answers 409 dayClosed for a closed day and creates nothing', async () => {
    const email = uniqueTestEmail('plink-closed')
    const refused = await createProBooking(
      adminCookie,
      proCreateBody(CLOSED_DAY, { email, mode: 'payment_link' }),
    )
    expect(refused.status).toBe(409)
    expect(refused.body.data?.code).toBe('dayClosed')
    expect(await findBookings(email)).toEqual([])
  })
})
