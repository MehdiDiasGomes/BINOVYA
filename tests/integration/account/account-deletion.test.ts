import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  createCustomer,
  openSession,
  readProfileState,
  sessionCookie,
  type AccountCustomer,
} from '../../support/account'
import { assertTestStripeKey, cleanupE2eData, rest } from '../../support/db'
import { BASE_URL, ORIGIN, adminMailbox, readEnv, uniqueTestEmail } from '../../support/env'
import { mailsAfterSettling } from '../../support/outbox'

const requestDeletion = (headers: Record<string, string>): Promise<Response> =>
  fetch(`${BASE_URL}/api/account/deletion-request`, { method: 'POST', headers })

let customer: AccountCustomer
let other: AccountCustomer
let cookie: string
let accessToken: string
let otherCookie: string
let startedAt: Date

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  customer = await createCustomer({ email: uniqueTestEmail('delete'), firstName: 'Supprime' })
  other = await createCustomer({ email: uniqueTestEmail('bystander'), firstName: 'Voisin' })
  const session = await openSession(customer.email)
  cookie = sessionCookie(session.raw)
  accessToken = session.access_token
  otherCookie = sessionCookie((await openSession(other.email)).raw)
  startedAt = new Date()
})

afterAll(async () => {
  await cleanupE2eData()
})

describe('POST /api/account/deletion-request: guards', () => {
  it('answers 403 without an Origin header, even with a session', async () => {
    expect((await requestDeletion({ Cookie: cookie })).status).toBe(403)
  })

  it('answers 403 with a foreign Origin', async () => {
    const response = await requestDeletion({ Cookie: cookie, Origin: 'https://evil.example.com' })
    expect(response.status).toBe(403)
  })

  it('answers 403 with the literal Origin "null"', async () => {
    expect((await requestDeletion({ Cookie: cookie, Origin: 'null' })).status).toBe(403)
  })

  it('answers 401 without a session when the Origin is right', async () => {
    expect((await requestDeletion({ Origin: ORIGIN })).status).toBe(401)
  })

  it('checks the origin before the session: foreign Origin without session is 403', async () => {
    expect((await requestDeletion({ Origin: 'https://evil.example.com' })).status).toBe(403)
  })

  it('left the profile untouched after the refused requests', async () => {
    expect((await readProfileState(customer.id)).deletion_requested_at).toBeNull()
  })
})

describe('POST /api/account/deletion-request: request', () => {
  let requestedAt = ''

  it('answers 200 with the request time and stores it', async () => {
    const response = await requestDeletion({ Cookie: cookie, Origin: ORIGIN })
    expect(response.status).toBe(200)
    requestedAt = ((await response.json()) as { requestedAt: string }).requestedAt
    const stored = (await readProfileState(customer.id)).deletion_requested_at
    expect(new Date(stored ?? 0).getTime()).toBe(new Date(requestedAt).getTime())
  })

  it('answers the same request time on a second call and does not alert again', async () => {
    const response = await requestDeletion({ Cookie: cookie, Origin: ORIGIN })
    expect(response.status).toBe(200)
    expect(((await response.json()) as { requestedAt: string }).requestedAt).toBe(requestedAt)
    const alerts = await mailsAfterSettling({
      to: adminMailbox(),
      subjectIncludes: 'Demande de suppression de compte - Compte Supprime',
      since: startedAt,
    })
    expect(alerts).toHaveLength(1)
    expect(
      new Date((await readProfileState(customer.id)).deletion_requested_at ?? 0).getTime(),
    ).toBe(new Date(requestedAt).getTime())
  })

  it('shows the request in the account overview', async () => {
    const response = await fetch(`${BASE_URL}/api/account/bookings`, {
      headers: { Cookie: cookie },
    })
    const body = (await response.json()) as { deletionRequestedAt: string | null }
    expect(new Date(body.deletionRequestedAt ?? 0).getTime()).toBe(new Date(requestedAt).getTime())
  })

  it('leaves another customer untouched', async () => {
    expect((await readProfileState(other.id)).deletion_requested_at).toBeNull()
    const response = await fetch(`${BASE_URL}/api/account/bookings`, {
      headers: { Cookie: otherCookie },
    })
    expect(
      ((await response.json()) as { deletionRequestedAt: unknown }).deletionRequestedAt,
    ).toBeNull()
  })
})

describe('profiles write access of a customer JWT through PostgREST', () => {
  const patchAs = (id: string, body: Record<string, unknown>): Promise<Response> =>
    fetch(`${readEnv('NUXT_PUBLIC_SUPABASE_URL')}/rest/v1/profiles?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        apikey: readEnv('NUXT_PUBLIC_SUPABASE_KEY'),
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(body),
    })

  const readColumn = async (id: string, column: string): Promise<unknown> => {
    const response = await rest(`/rest/v1/profiles?select=${column}&id=eq.${id}`)
    return ((await response.json()) as Record<string, unknown>[])[0]?.[column]
  }

  it.each([
    ['first_name', 'Hacked'],
    ['last_name', 'Hacked'],
    ['phone', '+33600000000'],
    ['email', 'hacked@example.test'],
    ['deletion_requested_at', null],
    ['login_link_count', 0],
    ['login_link_sent_at', null],
  ])('cannot update its own %s', async (column, value) => {
    const before = await readColumn(customer.id, column)
    const response = await patchAs(customer.id, { [column]: value })
    const rows = response.ok ? ((await response.json()) as unknown[]) : []
    expect(rows).toHaveLength(0)
    expect(await readColumn(customer.id, column)).toEqual(before)
  })

  it('cannot update the profile of another customer', async () => {
    const response = await patchAs(other.id, { first_name: 'Hacked' })
    const rows = response.ok ? ((await response.json()) as unknown[]) : []
    expect(rows).toHaveLength(0)
    expect(await readColumn(other.id, 'first_name')).toBe('Voisin')
  })

  it('cannot call claim_login_link with a customer JWT', async () => {
    const response = await fetch(
      `${readEnv('NUXT_PUBLIC_SUPABASE_URL')}/rest/v1/rpc/claim_login_link`,
      {
        method: 'POST',
        headers: {
          apikey: readEnv('NUXT_PUBLIC_SUPABASE_KEY'),
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_email: other.email }),
      },
    )
    expect(response.ok).toBe(false)
  })

  it('cannot read the profile of another customer', async () => {
    const response = await fetch(
      `${readEnv('NUXT_PUBLIC_SUPABASE_URL')}/rest/v1/profiles?select=id&id=eq.${other.id}`,
      {
        headers: {
          apikey: readEnv('NUXT_PUBLIC_SUPABASE_KEY'),
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    expect((await response.json()) as unknown[]).toHaveLength(0)
  })
})
