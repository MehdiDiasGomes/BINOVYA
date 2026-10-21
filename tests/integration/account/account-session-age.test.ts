import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  createCustomer,
  openPasswordSession,
  openSession,
  readProfileState,
  seedAccountBooking,
  seedPhoto,
  sessionCookie,
  type AccountCustomer,
} from '../../support/account'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { BASE_URL, ORIGIN, readEnv, uniqueTestEmail } from '../../support/env'

type Tokens = { access_token: string; raw: string }

let customer: AccountCustomer
let bookingId: string
let fresh: Tokens
let noRecentSignIn: Tokens
let photoPath: string

const supabase = (path: string, token: string, init: RequestInit = {}): Promise<Response> =>
  fetch(`${readEnv('NUXT_PUBLIC_SUPABASE_URL')}${path}`, {
    ...init,
    headers: {
      apikey: readEnv('NUXT_PUBLIC_SUPABASE_KEY'),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  })

const rowsOf = async (table: string, token: string): Promise<unknown[]> => {
  const response = await supabase(`/rest/v1/${table}?select=id`, token)
  return response.ok ? ((await response.json()) as unknown[]) : []
}

const claimsOf = (token: string): { amr?: { method: string }[] } =>
  JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString()) as {
    amr?: { method: string }[]
  }

const sign = (token: string): Promise<Response> =>
  supabase(`/storage/v1/object/sign/intervention-photos/${photoPath}`, token, {
    method: 'POST',
    body: JSON.stringify({ expiresIn: 60 }),
  })

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  customer = await createCustomer({ email: uniqueTestEmail('age'), firstName: 'Age' })
  bookingId = await seedAccountBooking({
    customerId: customer.id,
    status: 'completed',
    scheduledDate: '2026-09-01',
  })
  photoPath = await seedPhoto({ bookingId, kind: 'before' })
  fresh = await openSession(customer.email)
  noRecentSignIn = await openPasswordSession(customer.id, customer.email)
})

afterAll(async () => {
  await cleanupE2eData()
})

describe('tokens used', () => {
  it('has a magic link token with an otp or magiclink amr entry', () => {
    const methods = (claimsOf(fresh.access_token).amr ?? []).map(entry => entry.method)
    expect(methods.some(method => ['otp', 'magiclink'].includes(method))).toBe(true)
  })

  it('has a second token without any otp or magiclink amr entry', () => {
    const methods = (claimsOf(noRecentSignIn.access_token).amr ?? []).map(entry => entry.method)
    expect(methods).toEqual(['password'])
  })
})

describe('row level security with a recent sign-in', () => {
  it.each(['profiles', 'bookings', 'intervention_photos'])(
    'returns the own %s row',
    async table => {
      expect(await rowsOf(table, fresh.access_token)).toHaveLength(1)
    },
  )

  it('signs an own photo', async () => {
    const response = await sign(fresh.access_token)
    expect(response.status).toBe(200)
  })
})

describe('row level security without a recent otp or magiclink sign-in', () => {
  it.each(['profiles', 'bookings', 'intervention_photos'])('returns no %s row', async table => {
    expect(await rowsOf(table, noRecentSignIn.access_token)).toHaveLength(0)
  })

  it('refuses to sign an own photo', async () => {
    const response = await sign(noRecentSignIn.access_token)
    expect(response.ok).toBe(false)
  })

  it('refuses to download an own photo', async () => {
    const response = await supabase(
      `/storage/v1/object/authenticated/intervention-photos/${photoPath}`,
      noRecentSignIn.access_token,
    )
    expect(response.ok).toBe(false)
    const allowed = await supabase(
      `/storage/v1/object/authenticated/intervention-photos/${photoPath}`,
      fresh.access_token,
    )
    expect(allowed.status).toBe(200)
  })
})

describe('server routes without a recent sign-in', () => {
  it('answers 401 on GET /api/account/bookings', async () => {
    const response = await fetch(`${BASE_URL}/api/account/bookings`, {
      headers: { Cookie: sessionCookie(noRecentSignIn.raw) },
    })
    expect(response.status).toBe(401)
  })

  it('answers 401 on POST /api/account/deletion-request and records nothing', async () => {
    const response = await fetch(`${BASE_URL}/api/account/deletion-request`, {
      method: 'POST',
      headers: { Cookie: sessionCookie(noRecentSignIn.raw), Origin: ORIGIN },
    })
    expect(response.status).toBe(401)
    expect((await readProfileState(customer.id)).deletion_requested_at).toBeNull()
  })

  it('still serves the same customer with the recent token', async () => {
    const response = await fetch(`${BASE_URL}/api/account/bookings`, {
      headers: { Cookie: sessionCookie(fresh.raw) },
    })
    expect(response.status).toBe(200)
  })
})
