import Stripe from 'stripe'
import { expect } from 'vitest'

import { signedAddress, THIONVILLE_ADDRESS } from './address'
import { findBookings, type BookingRow } from './db'
import { BASE_URL, ORIGIN, readEnv, uniqueTestEmail } from './env'

import type { AddressDetails } from '../../app/types/booking'

/** Maximum number of active bookings per day. */
export const DAY_CAPACITY: number = 3

export type ApiResult = {
  status: number
  body: Record<string, unknown> & { data?: { code?: string } }
  raw: string
}

export type BookingOverrides = Partial<{
  email: string
  date: string
  plan: string
  smallBinCount: number
  largeBinCount: number
  website: string
  firstName: string
  lastName: string
  locale: string
  address: AddressDetails
}>

export const bookingBody = (overrides: BookingOverrides = {}): Record<string, unknown> => ({
  address: signedAddress(overrides.address ?? THIONVILLE_ADDRESS),
  plan: overrides.plan ?? 'one_off',
  smallBinCount: overrides.smallBinCount ?? 1,
  largeBinCount: overrides.largeBinCount ?? 0,
  householdCollectionWeekdays: [],
  recyclingCollectionWeekdays: [],
  binsReadyConfirmed: true,
  date: overrides.date ?? '2026-12-01',
  contact: {
    firstName: overrides.firstName ?? 'Int',
    lastName: overrides.lastName ?? 'Test',
    email: overrides.email ?? uniqueTestEmail('default'),
    phone: '+33612345678',
  },
  locale: overrides.locale ?? 'fr',
  website: overrides.website ?? '',
})

const parseBody = (raw: string): ApiResult['body'] => {
  try {
    return JSON.parse(raw) as ApiResult['body']
  } catch {
    return {}
  }
}

export type SendOptions = {
  cookie?: string
  body?: unknown
  origin?: string | null
}

/**
 * Sends a state-changing request to the test server, with the site `Origin` by default.
 * @param method - HTTP method
 * @param path - Path with its query string
 * @param options - Session cookie, JSON body, and `Origin` (null to send none)
 * @returns Status, parsed JSON body and raw body
 */
export const sendApi = async (
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  options: SendOptions = {},
): Promise<ApiResult> => {
  const origin: string | null = options.origin === undefined ? ORIGIN : options.origin
  const response: Response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const raw: string = await response.text()
  return { status: response.status, body: parseBody(raw), raw }
}

export const postJson = async (
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<ApiResult> => {
  const response: Response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
  const raw: string = await response.text()
  return { status: response.status, body: parseBody(raw), raw }
}

export type GetResult = ApiResult & { headers: Headers }

/**
 * Sends a GET request to the test server.
 * @param path - Path with its query string
 * @param cookie - Optional `Cookie` header carrying a session
 * @returns Status, parsed JSON body, raw body and response headers
 */
export const getApi = async (path: string, cookie?: string): Promise<GetResult> => {
  const response: Response = await fetch(`${BASE_URL}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
  })
  const raw: string = await response.text()
  return { status: response.status, body: parseBody(raw), raw, headers: response.headers }
}

export const createBooking = (overrides: BookingOverrides = {}): Promise<ApiResult> =>
  postJson('/api/booking', bookingBody(overrides))

export const releaseBooking = (bookingId: string): Promise<ApiResult> =>
  postJson('/api/booking/release', { bookingId })

export const stripeClient = (): Stripe => new Stripe(readEnv('NUXT_STRIPE_SECRET_KEY'))

type SessionOverrides = Partial<{
  amount: number
  paymentIntent: string | null
  paymentStatus: string
  currency: string
}>

export const sessionEvent = (
  type: 'checkout.session.completed' | 'checkout.session.expired',
  booking: { id: string; sessionId: string; amount: number },
  overrides: SessionOverrides = {},
): string =>
  JSON.stringify({
    id: `evt_test_${crypto.randomUUID().replaceAll('-', '')}`,
    object: 'event',
    api_version: '2025-01-01',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    type,
    data: {
      object: {
        id: booking.sessionId,
        object: 'checkout.session',
        client_reference_id: booking.id,
        payment_status: overrides.paymentStatus ?? 'paid',
        amount_total: overrides.amount ?? booking.amount,
        currency: overrides.currency ?? 'eur',
        payment_intent:
          overrides.paymentIntent === undefined
            ? `pi_test_${crypto.randomUUID().replaceAll('-', '').slice(0, 24)}`
            : overrides.paymentIntent,
      },
    },
  })

export const sign = (
  payload: string,
  secret: string = readEnv('NUXT_STRIPE_WEBHOOK_SECRET'),
): string => Stripe.webhooks.generateTestHeaderString({ payload, secret })

export const postWebhook = (payload: string, signature?: string): Promise<ApiResult> =>
  postJson('/api/stripe/webhook', payload, signature ? { 'stripe-signature': signature } : {})

export const postSignedWebhook = (payload: string): Promise<ApiResult> =>
  postWebhook(payload, sign(payload))

export type PendingBooking = { id: string; sessionId: string; amount: number; email: string }

/**
 * Creates a booking through the real route, which opens a Stripe Checkout session.
 * @param tag - Short label put in the customer email
 * @param date - Intervention date
 * @param email - Customer email, unique by default
 * @returns Booking id, Checkout session id, amount in cents and email
 */
export const newPendingBooking = async (
  tag: string,
  date: string,
  email: string = uniqueTestEmail(tag),
): Promise<PendingBooking> => {
  const result: ApiResult = await createBooking({ email, date })
  expect(result.status).toBe(200)
  const [row] = await findBookings(email)
  expect(row?.stripe_checkout_session_id).toMatch(/^cs_test_/)
  return {
    id: String(result.body.bookingId),
    sessionId: row?.stripe_checkout_session_id ?? '',
    amount: Number(result.body.amountTotalCents),
    email,
  }
}

/**
 * Reads the latest booking row of a customer.
 * @param booking - Booking created by `newPendingBooking`
 * @returns Booking row with the customer
 */
export const lastRow = async (booking: PendingBooking): Promise<BookingRow> => {
  const [row] = await findBookings(booking.email)
  if (!row) {
    throw new Error('Booking row missing')
  }
  return row
}

/**
 * Expires a pending booking with a signed `checkout.session.expired` event.
 * @param booking - Booking created by `newPendingBooking`
 */
export const expireBooking = async (booking: PendingBooking): Promise<void> => {
  const result: ApiResult = await postSignedWebhook(
    sessionEvent('checkout.session.expired', booking),
  )
  expect(result.status).toBe(200)
  expect((await lastRow(booking)).status).toBe('expired')
}

/**
 * Fills the capacity of a day with three other pending bookings.
 * @param date - Intervention date
 * @param tag - Short label put in the customer emails
 */
export const fillDay = async (date: string, tag: string): Promise<void> => {
  await Array.from({ length: DAY_CAPACITY }, (_unused: unknown, index: number) => index).reduce(
    (previous: Promise<unknown>, index: number) =>
      previous.then(() => newPendingBooking(`${tag}-fill${index}`, date)),
    Promise.resolve(),
  )
}

/**
 * Creates a PaymentIntent in Stripe test mode that is already paid.
 * @param booking - Booking the payment belongs to
 * @returns Payment intent id
 */
export const payInStripeTestMode = async (booking: PendingBooking): Promise<string> => {
  const paymentIntent = await stripeClient().paymentIntents.create({
    amount: booking.amount,
    currency: 'eur',
    payment_method: 'pm_card_visa',
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    metadata: { booking_id: booking.id },
  })
  expect(paymentIntent.status).toBe('succeeded')
  return paymentIntent.id
}
