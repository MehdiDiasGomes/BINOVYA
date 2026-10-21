import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { sleep } from '../../../scripts/test-process'
import {
  createCustomer,
  openPasswordSession,
  openSession,
  sessionCookie,
  type AccountCustomer,
} from '../../support/account'
import { createAdmin, removeE2eAdmins } from '../../support/admin'
import { getApi, type GetResult } from '../../support/api'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { readEnv, uniqueTestEmail } from '../../support/env'

const NO_STORE = 'private, no-store'

const ROUTES: [string, string, string][] = [
  ['planning', '/api/pro/planning', 'date=2041-03-12'],
  ['interventions', '/api/pro/interventions', 'status=all'],
]

const INVALID_QUERIES: Record<string, string[]> = {
  planning: ['date=2026-02-30', 'date=hier', 'date=2026-10-1'],
  interventions: [
    'status=refunded',
    'status=bogus',
    'from=2026-13-01',
    'to=nope',
    'from=2041-04-02&to=2041-04-01',
    'page=0',
    'page=1001',
    'page=-3',
    'page=abc',
    'page=1.5',
  ],
}

let customerCookie: string
let adminCookie: string
let passwordAdminCookie: string
let passwordAdminToken: string

const call = (path: string, query: string, cookie?: string): Promise<GetResult> =>
  getApi(`${path}?${query}`, cookie)

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  const customer: AccountCustomer = await createCustomer({
    email: uniqueTestEmail('pro-access-cust'),
    firstName: 'Cliente',
  })
  const admin: AccountCustomer = await createAdmin(uniqueTestEmail('pro-access-admin'))
  const passwordAdmin: AccountCustomer = await createAdmin(uniqueTestEmail('pro-access-pwd'))
  customerCookie = sessionCookie((await openSession(customer.email)).raw)
  adminCookie = sessionCookie((await openSession(admin.email)).raw)
  const passwordSession = await openPasswordSession(passwordAdmin.id, passwordAdmin.email)
  passwordAdminCookie = sessionCookie(passwordSession.raw)
  passwordAdminToken = passwordSession.access_token
})

afterAll(async () => {
  await cleanupE2eData()
  await removeE2eAdmins()
})

describe.each(ROUTES)('GET %s access rules', (name, path, validQuery) => {
  it('answers 401 without session', async () => {
    const result = await call(path, validQuery)
    expect(result.status).toBe(401)
  })

  it('answers 403 to a customer session', async () => {
    const result = await call(path, validQuery, customerCookie)
    expect(result.status).toBe(403)
  })

  it('answers 401 to an admin whose session was opened by password', async () => {
    const result = await call(path, validQuery, passwordAdminCookie)
    expect(result.status).toBe(401)
  })

  it('answers 200 to an admin signed in with a login link', async () => {
    const result = await call(path, validQuery, adminCookie)
    expect(result.status).toBe(200)
  })

  it('sends Cache-Control private, no-store on 200, 400, 401 and 403', async () => {
    const answers: GetResult[] = [
      await call(path, validQuery, adminCookie),
      await call(path, INVALID_QUERIES[name]?.[0] ?? '', adminCookie),
      await call(path, validQuery),
      await call(path, validQuery, customerCookie),
      await call(path, validQuery, passwordAdminCookie),
    ]
    expect(answers.map(answer => answer.status)).toEqual([200, 400, 401, 403, 401])
    expect(answers.map(answer => answer.headers.get('cache-control'))).toEqual(
      Array(5).fill(NO_STORE),
    )
  })

  it('checks the session before the query: an invalid query is 401 without session, 403 for a customer', async () => {
    const invalid = INVALID_QUERIES[name]?.[0] ?? ''
    expect((await call(path, invalid)).status).toBe(401)
    expect((await call(path, invalid, customerCookie)).status).toBe(403)
  })

  it.each(INVALID_QUERIES[name] ?? [])('answers 400 to an admin for ?%s', async query => {
    const result = await call(path, query, adminCookie)
    expect(result.status).toBe(400)
  })
})

describe('revocation of a refused admin session', () => {
  it('ends the password session of an admin on the server after the 401', async () => {
    expect((await getApi('/api/pro/planning', passwordAdminCookie)).status).toBe(401)
    const deadline = Date.now() + 8_000
    let status = 200
    while (status === 200 && Date.now() < deadline) {
      const response = await fetch(`${readEnv('NUXT_PUBLIC_SUPABASE_URL')}/auth/v1/user`, {
        headers: {
          apikey: readEnv('NUXT_PUBLIC_SUPABASE_KEY'),
          Authorization: `Bearer ${passwordAdminToken}`,
        },
      })
      status = response.status
      await sleep(250)
    }
    expect(status).not.toBe(200)
  })
})
