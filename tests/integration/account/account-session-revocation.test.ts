import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  createCustomer,
  openPasswordSession,
  sessionCookie,
  type AccountCustomer,
} from '../../support/account'
import { assertTestStripeKey, cleanupE2eData, sleep } from '../../support/db'
import { BASE_URL, readEnv, uniqueTestEmail } from '../../support/env'

type Tokens = { access_token: string; refresh_token: string; raw: string }

let customer: AccountCustomer
let tokens: Tokens

const authCall = (path: string, init: RequestInit = {}, token?: string): Promise<Response> =>
  fetch(`${readEnv('NUXT_PUBLIC_SUPABASE_URL')}${path}`, {
    ...init,
    headers: {
      apikey: readEnv('NUXT_PUBLIC_SUPABASE_KEY'),
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

const refresh = (refreshToken: string): Promise<Response> =>
  authCall('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  customer = await createCustomer({ email: uniqueTestEmail('revoke'), firstName: 'Revoque' })
  tokens = await openPasswordSession(customer.id, customer.email)
})

afterAll(async () => {
  await cleanupE2eData()
})

describe('server side revocation of a session past its lifetime', () => {
  it('has a working refresh token and access token before the request', async () => {
    expect((await authCall('/auth/v1/user', {}, tokens.access_token)).status).toBe(200)
  })

  it('answers 401 and then revokes the refresh token in GoTrue', async () => {
    const response = await fetch(`${BASE_URL}/api/account/bookings`, {
      headers: { Cookie: sessionCookie(tokens.raw) },
    })
    expect(response.status).toBe(401)
    let status = 0
    for (let attempt = 0; attempt < 10 && status < 400; attempt += 1) {
      await sleep(500)
      status = (await refresh(tokens.refresh_token)).status
    }
    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('rejects the old access token on /auth/v1/user once the session is revoked', async () => {
    const response = await authCall('/auth/v1/user', {}, tokens.access_token)
    expect([401, 403]).toContain(response.status)
  })
})
