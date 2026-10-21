import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { addDaysToIsoDate, formatFullDate } from '../../../app/utils/date'
import { formatPrice } from '../../../app/utils/pricing'
import {
  createCustomer,
  countAuthUsersByEmail,
  openSession,
  sessionCookie,
} from '../../support/account'
import {
  LYON_COMMUNE,
  PARIS_ADDRESS,
  signedAddress,
  signedMunicipality,
  THIONVILLE_ADDRESS,
} from '../../support/address'
import { createAdmin, removeE2eAdmins } from '../../support/admin'
import { sendApi, stripeClient, type ApiResult } from '../../support/api'
import {
  assertTestStripeKey,
  cleanupE2eData,
  findBookings,
  readBookingStripe,
  readPrice,
} from '../../support/db'
import { adminMailbox, uniqueTestEmail } from '../../support/env'
import {
  htmlToText,
  mailsAfterSettling,
  normalizeSpaces,
  waitForMails,
  waitForOneMail,
} from '../../support/outbox'
import { FAR_RANGES, farDates, removeOverrides } from '../../support/pro'
import { createProBooking, proCreateBody, readProfileNames } from '../../support/pro-create'
import { parisDateFromToday } from '../../support/seed'

import type { ProCreateResponse } from '../../../app/types/proCreate'

const [OPEN_DAY, CLOSED_DAY, FULL_DAY, SECTOR_DAY, AREA_DAY, FORCE_DAY] = farDates(
  FAR_RANGES.integrationProCreate,
) as [string, string, string, string, string, string]

const HOLD_MINUTES = 1435

const CHECKOUT_MARGIN_MS = 60_000

const CLOCK_TOLERANCE_MS = 5 * 60_000

let adminCookie = ''
let customerCookie = ''

const putOverride = (date: string, body: Record<string, unknown>): Promise<ApiResult> =>
  sendApi('PUT', `/api/pro/availability/overrides/${date}`, {
    cookie: adminCookie,
    body: { maxBookings: 10, note: null, ...body },
  })

const create = (
  date: string,
  overrides: Parameters<typeof proCreateBody>[1] = {},
): Promise<ApiResult> => createProBooking(adminCookie, proCreateBody(date, overrides))

const asResponse = (result: ApiResult): ProCreateResponse =>
  result.body as unknown as ProCreateResponse

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  await removeOverrides([OPEN_DAY, CLOSED_DAY, FULL_DAY, SECTOR_DAY, AREA_DAY, FORCE_DAY])
  const admin = await createAdmin(uniqueTestEmail('pcreate-admin'))
  const customer = await createCustomer({
    email: uniqueTestEmail('pcreate-cust'),
    firstName: 'Cliente',
  })
  adminCookie = sessionCookie((await openSession(admin.email)).raw)
  customerCookie = sessionCookie((await openSession(customer.email)).raw)
  await putOverride(OPEN_DAY, { maxBookings: 40 })
  await putOverride(AREA_DAY, {})
  await putOverride(FORCE_DAY, {})
  await putOverride(CLOSED_DAY, { maxBookings: 0 })
  await putOverride(FULL_DAY, { maxBookings: 1 })
  await putOverride(SECTOR_DAY, { sector: signedMunicipality(LYON_COMMUNE) })
  expect((await create(FULL_DAY)).status).toBe(200)
})

afterAll(async () => {
  await removeOverrides([OPEN_DAY, CLOSED_DAY, FULL_DAY, SECTOR_DAY, AREA_DAY, FORCE_DAY])
  await cleanupE2eData()
  await removeE2eAdmins()
})

describe('access rules of POST /api/pro/bookings', () => {
  it('answers 401 without session', async () => {
    const email = uniqueTestEmail('pcreate-anon')
    const result = await createProBooking('', proCreateBody(OPEN_DAY, { email }))
    expect(result.status).toBe(401)
    expect(await findBookings(email)).toEqual([])
  })

  it('answers 403 to a customer session and creates nothing', async () => {
    const email = uniqueTestEmail('pcreate-cust403')
    const result = await createProBooking(customerCookie, proCreateBody(OPEN_DAY, { email }))
    expect(result.status).toBe(403)
    expect(await findBookings(email)).toEqual([])
  })

  it('answers 403 forbiddenOrigin without or with a foreign Origin', async () => {
    const body = proCreateBody(OPEN_DAY)
    const missing = await sendApi('POST', '/api/pro/bookings', {
      cookie: adminCookie,
      body,
      origin: null,
    })
    expect(missing.status).toBe(403)
    expect(missing.body.data?.code).toBe('forbiddenOrigin')
    const foreign = await sendApi('POST', '/api/pro/bookings', {
      cookie: adminCookie,
      body,
      origin: 'https://evil.example.com',
    })
    expect(foreign.status).toBe(403)
  })

  it('answers 413 to a body over 8 KB', async () => {
    const body = { ...proCreateBody(OPEN_DAY), padding: 'x'.repeat(9000) }
    expect((await createProBooking(adminCookie, body)).status).toBe(413)
  })
})

describe('never-forceable refusals of POST /api/pro/bookings', () => {
  type Refusal = {
    overrides: Parameters<typeof proCreateBody>[1]
    status: number
    code: string
    date?: string
  }

  const refused = async ({ overrides, status, code, date = OPEN_DAY }: Refusal): Promise<void> => {
    const email = uniqueTestEmail('pcreate-refused')
    const result = await create(date, { email, force: true, ...overrides })
    expect(result.status).toBe(status)
    expect(result.body.data?.code).toBe(code)
    expect(await findBookings(email)).toEqual([])
  }

  it('answers 400 invalidInput for a malformed body, even with force', async () => {
    const result = await createProBooking(adminCookie, { ...proCreateBody(OPEN_DAY), mode: 'x' })
    expect(result.status).toBe(400)
    expect(result.body.data?.code).toBe('invalidInput')
  })

  it('answers 400 invalidInput for an invalid email', async () => {
    await expect(
      refused({ overrides: { email: 'not-an-email' }, status: 400, code: 'invalidInput' }),
    ).resolves.toBeUndefined()
  })

  it('answers 400 tooFar beyond the 365 day horizon', async () => {
    await expect(
      refused({
        overrides: {},
        status: 400,
        code: 'tooFar',
        date: addDaysToIsoDate(parisDateFromToday(0), 366),
      }),
    ).resolves.toBeUndefined()
  })

  it('answers 400 invalidAddress for an address the server did not sign', async () => {
    const email = uniqueTestEmail('pcreate-unsigned')
    const body = proCreateBody(OPEN_DAY, { email, force: true }) as Record<string, unknown>
    body.address = { ...signedAddress(THIONVILLE_ADDRESS), latitude: 49.5 }
    const result = await createProBooking(adminCookie, body)
    expect(result.status).toBe(400)
    expect(result.body.data?.code).toBe('invalidAddress')
    expect(await findBookings(email)).toEqual([])
  })

  it('answers 400 invalidQuantities for more than 2 bins of a kind', async () => {
    await expect(
      refused({ overrides: { smallBinCount: 3 }, status: 400, code: 'invalidQuantities' }),
    ).resolves.toBeUndefined()
  })

  it('answers 422 quoteRequired when the grid has no price', async () => {
    await expect(
      refused({
        overrides: { smallBinCount: 1, largeBinCount: 1 },
        status: 422,
        code: 'quoteRequired',
      }),
    ).resolves.toBeUndefined()
  })

  it('answers 422 pastDate for yesterday, even with force', async () => {
    await expect(
      refused({
        overrides: {},
        status: 422,
        code: 'pastDate',
        date: addDaysToIsoDate(parisDateFromToday(0), -1),
      }),
    ).resolves.toBeUndefined()
  })
})

describe('forceable refusals of POST /api/pro/bookings', () => {
  it.each([
    ['dayClosed', () => CLOSED_DAY, {}],
    ['dayFull', () => FULL_DAY, {}],
    ['outOfSector', () => SECTOR_DAY, {}],
    ['outOfArea', () => AREA_DAY, { address: PARIS_ADDRESS }],
  ])(
    'refuses %s with 409, then creates it with force and reports it',
    async (code, date, extra) => {
      const email = uniqueTestEmail(`pcreate-${code.toLowerCase()}`)
      const refused = await create(date(), { email, ...extra })
      expect(refused.status).toBe(409)
      expect(refused.body.data?.code).toBe(code)
      expect(await findBookings(email)).toEqual([])

      const forced = await create(date(), { email, force: true, ...extra })
      expect(forced.status).toBe(200)
      expect(asResponse(forced).overriddenCodes).toEqual([code])
      const row = await readBookingStripe(asResponse(forced).bookingId)
      expect(row.status).toBe('paid')
    },
  )

  it('reports every overridden refusal when several apply', async () => {
    const forced = await create(CLOSED_DAY, { address: PARIS_ADDRESS, force: true })
    expect(forced.status).toBe(200)
    expect(asResponse(forced).overriddenCodes.sort()).toEqual(['dayClosed', 'outOfArea'])
  })

  it('treats force as a no-op on an available day', async () => {
    const forced = await create(FORCE_DAY, { force: true })
    expect(forced.status).toBe(200)
    expect(asResponse(forced).overriddenCodes).toEqual([])
  })
})

describe('an offline intervention', () => {
  it('is created paid, offline, without any Stripe id, and only the confirmation is mailed', async () => {
    const email = uniqueTestEmail('pcreate-offline')
    const lastName = `Hors Ligne ${crypto.randomUUID().slice(0, 8)}`
    const result = await create(OPEN_DAY, { email, lastName, mode: 'offline' })
    expect(result.status).toBe(200)
    const created = asResponse(result)
    const price = await readPrice('one_off', 1, 0)
    expect(created).toEqual({
      bookingId: expect.any(String),
      mode: 'offline',
      scheduledDate: OPEN_DAY,
      amountTotalCents: price,
      paymentDueAt: null,
      overriddenCodes: [],
      isEmailSent: true,
      isReplay: false,
    })

    const row = await readBookingStripe(created.bookingId)
    expect(row).toMatchObject({
      status: 'paid',
      payment_method: 'offline',
      created_by_admin: true,
      stripe_checkout_session_id: null,
      stripe_payment_intent_id: null,
      stripe_invoice_id: null,
      expires_at: null,
      amount_total_cents: price,
    })

    const confirmation = await waitForOneMail({ to: email, subjectIncludes: 'est confirmée' })
    expect(confirmation.subject).toContain(formatFullDate(OPEN_DAY, 'fr-FR'))
    expect(confirmation.idempotencyKey).toBe(`booking-confirmation-${created.bookingId}`)
    expect(await mailsAfterSettling({ to: adminMailbox(), subjectIncludes: lastName })).toEqual([])
    expect(await waitForMails({ to: email, subjectIncludes: 'finalisez' }, 500)).toEqual([])
  })

  it('creates the customer account and profile on first booking', async () => {
    const email = uniqueTestEmail('pcreate-new')
    expect((await create(OPEN_DAY, { email, firstName: 'Nouvelle' })).status).toBe(200)
    expect(await countAuthUsersByEmail(email)).toBe(1)
    expect(await readProfileNames(email)).toMatchObject({ first_name: 'Nouvelle' })
  })

  it('does not overwrite the profile of an existing customer, whatever the email case', async () => {
    const email = uniqueTestEmail('pcreate-existing')
    await createCustomer({ email, firstName: 'Existante' })
    const result = await create(OPEN_DAY, {
      email: email.toUpperCase(),
      firstName: 'Usurpee',
      lastName: 'Autre',
      phone: '+33699999999',
    })
    expect(result.status).toBe(200)
    expect(await readProfileNames(email)).toEqual({
      first_name: 'Existante',
      last_name: 'Compte',
      phone: '+33612345678',
    })
    expect(await countAuthUsersByEmail(email)).toBe(1)
    expect(await findBookings(email)).toHaveLength(1)
  })
})

describe('a payment link intervention', () => {
  it('holds the slot 1435 minutes, opens a Checkout session and mails the link', async () => {
    const email = uniqueTestEmail('pcreate-link')
    const result = await create(OPEN_DAY, { email, mode: 'payment_link' })
    expect(result.status).toBe(200)
    const created = asResponse(result)
    const price = await readPrice('one_off', 1, 0)
    expect(created).toMatchObject({
      mode: 'payment_link',
      amountTotalCents: price,
      overriddenCodes: [],
      isEmailSent: true,
    })
    const dueAt = Date.parse(created.paymentDueAt ?? '')
    expect(Math.abs(dueAt - (Date.now() + HOLD_MINUTES * 60_000))).toBeLessThan(CLOCK_TOLERANCE_MS)

    const row = await readBookingStripe(created.bookingId)
    expect(row).toMatchObject({
      status: 'pending_payment',
      payment_method: 'stripe',
      created_by_admin: true,
      stripe_payment_intent_id: null,
      stripe_invoice_id: null,
    })
    expect(Math.abs(Date.parse(row.expires_at ?? '') - (dueAt + CHECKOUT_MARGIN_MS))).toBeLessThan(
      1000,
    )
    expect(row.stripe_checkout_session_id).toMatch(/^cs_test_/)

    const session = await stripeClient().checkout.sessions.retrieve(
      row.stripe_checkout_session_id ?? '',
    )
    expect(session.status).toBe('open')
    expect(session.amount_total).toBe(price)
    expect(session.client_reference_id).toBe(created.bookingId)
    expect(session.invoice_creation?.enabled).toBe(true)
    expect(session.expires_at).toBe(Math.floor(dueAt / 1000))
    expect(session.expires_at - Math.floor(Date.now() / 1000)).toBeLessThan(24 * 3600)

    const mail = await waitForOneMail({ to: email, subjectIncludes: 'finalisez le paiement' })
    expect(mail.idempotencyKey).toBe(`booking-payment-link-${created.bookingId}`)
    expect(mail.html).toContain(session.url?.replaceAll('&', '&amp;'))
    const text = normalizeSpaces(htmlToText(mail.html))
    expect(text).toContain(normalizeSpaces(formatPrice(price, 'fr-FR')))
    expect(text).toContain(formatFullDate(OPEN_DAY, 'fr-FR'))
    expect(await waitForMails({ to: email, subjectIncludes: 'est confirmée' }, 500)).toEqual([])
  })

  it('refuses a second link for a customer who has one pending, with customerPending', async () => {
    const email = uniqueTestEmail('pcreate-pending')
    expect((await create(OPEN_DAY, { email, mode: 'payment_link' })).status).toBe(200)
    const second = await create(OPEN_DAY, { email, mode: 'payment_link', force: true })
    expect(second.status).toBe(409)
    expect(second.body.data?.code).toBe('customerPending')
    expect(await findBookings(email)).toHaveLength(1)
  })

  it('counts a pending link against the capacity of the day', async () => {
    const email = uniqueTestEmail('pcreate-hold')
    const date = addDaysToIsoDate(FULL_DAY, 0)
    const result = await create(date, { email, mode: 'payment_link' })
    expect(result.status).toBe(409)
    expect(result.body.data?.code).toBe('dayFull')
  })
})
