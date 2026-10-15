import Stripe from 'stripe'

import { readEnv } from '../../support/db'

export const BASE_URL: string = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

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
  locale: string
  address: Record<string, unknown>
}>

export const THIONVILLE_ADDRESS: Record<string, unknown> = {
  label: '12 rue de la Gare, 57100 Thionville',
  city: 'Thionville',
  postcode: '57100',
  countryCode: 'FR',
  latitude: 49.3595,
  longitude: 6.1685,
}

export const PARIS_ADDRESS: Record<string, unknown> = {
  label: '1 rue de Rivoli, 75001 Paris',
  city: 'Paris',
  postcode: '75001',
  countryCode: 'FR',
  latitude: 48.8606,
  longitude: 2.3376,
}

export const newEmail = (tag: string): string =>
  `delivered+e2e-int-${tag}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}@resend.dev`

export const bookingBody = (overrides: BookingOverrides = {}): Record<string, unknown> => ({
  address: overrides.address ?? THIONVILLE_ADDRESS,
  plan: overrides.plan ?? 'one_off',
  smallBinCount: overrides.smallBinCount ?? 1,
  largeBinCount: overrides.largeBinCount ?? 0,
  householdCollectionWeekdays: [],
  recyclingCollectionWeekdays: [],
  binsReadyConfirmed: true,
  date: overrides.date ?? '2026-12-01',
  contact: {
    firstName: 'Int',
    lastName: 'Test',
    email: overrides.email ?? newEmail('default'),
    phone: '+33612345678',
  },
  locale: overrides.locale ?? 'fr',
  website: overrides.website ?? '',
})

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
  let parsed: ApiResult['body'] = {}
  try {
    parsed = JSON.parse(raw) as ApiResult['body']
  } catch {
    parsed = {}
  }
  return { status: response.status, body: parsed, raw }
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
