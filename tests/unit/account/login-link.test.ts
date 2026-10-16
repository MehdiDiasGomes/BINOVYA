import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createLoginLink } from '../../../server/utils/loginLink'

import type { Database } from '../../../app/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

type FakeOptions = {
  profile?: { email: string; first_name: string } | null
  authEmail?: string | null
  hashedToken?: string | null
  lookupError?: boolean
  generateError?: { code: string } | null
}

const CUSTOMER_ID = '11111111-2222-3333-4444-555555555555'

type FakeClient = { client: SupabaseClient<Database>; generate: ReturnType<typeof vi.fn> }

const authUserFor = (authEmail: string | null | undefined): { email: string } | null =>
  authEmail === null ? null : { email: authEmail ?? 'ada@example.test' }

const makeClient = (options: FakeOptions = {}): FakeClient => {
  const profile =
    options.profile === undefined
      ? { email: 'ada@example.test', first_name: 'Ada' }
      : options.profile
  const hashedToken: string | null =
    options.hashedToken === undefined ? 'hash_abc' : options.hashedToken
  const generate = vi.fn().mockResolvedValue({
    data: { properties: { hashed_token: hashedToken } },
    error: options.generateError ?? null,
  })
  const profileQuery = { eq: () => ({ maybeSingle: async () => ({ data: profile }) }) }
  const client = {
    from: () => ({ select: () => profileQuery }),
    auth: {
      admin: {
        getUserById: async () =>
          options.lookupError
            ? { data: { user: null }, error: { code: 'unexpected_failure' } }
            : { data: { user: authUserFor(options.authEmail) }, error: null },
        generateLink: generate,
      },
    },
  } as unknown as SupabaseClient<Database>
  return { client, generate }
}

const siteUrlFor = (locale: string, path: string): string => {
  const prefix: string = locale === 'fr' ? '' : '/' + locale
  return 'https://binovya.fr' + prefix + path
}

beforeEach(() => {
  vi.stubGlobal('localizedSiteUrl', siteUrlFor)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('createLoginLink', () => {
  it('puts the token in the URL fragment of the French confirm page', async () => {
    const { client } = makeClient()
    const link = await createLoginLink(client, { customerId: CUSTOMER_ID, locale: 'fr' })
    expect(link?.url).toBe('https://binovya.fr/account/confirm#token_hash=hash_abc')
  })

  it('never puts the token in the query string', async () => {
    const { client } = makeClient()
    const link = await createLoginLink(client, { customerId: CUSTOMER_ID, locale: 'fr' })
    expect(new URL(link?.url ?? '').search).toBe('')
  })

  it('prefixes the English confirm page with /en', async () => {
    const { client } = makeClient()
    const link = await createLoginLink(client, { customerId: CUSTOMER_ID, locale: 'en' })
    expect(link?.url).toBe('https://binovya.fr/en/account/confirm#token_hash=hash_abc')
  })

  it('returns the recipient email and first name of the profile', async () => {
    const { client } = makeClient()
    const link = await createLoginLink(client, { customerId: CUSTOMER_ID, locale: 'fr' })
    expect(link).toMatchObject({ email: 'ada@example.test', firstName: 'Ada' })
  })

  it('generates the link for the profile email, normalized', async () => {
    const { client, generate } = makeClient({
      profile: { email: ' Ada@Example.TEST ', first_name: 'Ada' },
      authEmail: 'ada@example.test',
    })
    await createLoginLink(client, { customerId: CUSTOMER_ID, locale: 'fr' })
    expect(generate).toHaveBeenCalledWith({ type: 'magiclink', email: 'ada@example.test' })
  })

  it('returns null and generates nothing when the Auth email differs from the profile', async () => {
    const { client, generate } = makeClient({ authEmail: 'other@example.test' })
    expect(await createLoginLink(client, { customerId: CUSTOMER_ID, locale: 'fr' })).toBeNull()
    expect(generate).not.toHaveBeenCalled()
  })

  it('logs only the customer id when the emails differ', async () => {
    const { client } = makeClient({ authEmail: 'other@example.test' })
    await createLoginLink(client, { customerId: CUSTOMER_ID, locale: 'fr' })
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls)
    expect(logged).toContain(CUSTOMER_ID)
    expect(logged).not.toContain('example.test')
  })

  it('has no type parameter in the fragment', async () => {
    const { client } = makeClient()
    const link = await createLoginLink(client, { customerId: CUSTOMER_ID, locale: 'fr' })
    expect(new URLSearchParams(new URL(link?.url ?? '').hash.slice(1)).has('type')).toBe(false)
  })

  it('returns null, generates nothing and logs when the auth lookup fails', async () => {
    const { client, generate } = makeClient({ lookupError: true })
    expect(await createLoginLink(client, { customerId: CUSTOMER_ID, locale: 'fr' })).toBeNull()
    expect(generate).not.toHaveBeenCalled()
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).toContain('auth user lookup failed')
  })

  it('returns null when the profile does not exist', async () => {
    const { client, generate } = makeClient({ profile: null })
    expect(await createLoginLink(client, { customerId: CUSTOMER_ID, locale: 'fr' })).toBeNull()
    expect(generate).not.toHaveBeenCalled()
  })

  it('returns null when the Auth user does not exist', async () => {
    const { client } = makeClient({ authEmail: null })
    expect(await createLoginLink(client, { customerId: CUSTOMER_ID, locale: 'fr' })).toBeNull()
  })

  it('returns null when Supabase gives no hashed token', async () => {
    const { client } = makeClient({ hashedToken: null })
    expect(await createLoginLink(client, { customerId: CUSTOMER_ID, locale: 'fr' })).toBeNull()
  })

  it('returns null when Supabase answers an error', async () => {
    const { client } = makeClient({ generateError: { code: 'over_email_send_rate_limit' } })
    expect(await createLoginLink(client, { customerId: CUSTOMER_ID, locale: 'fr' })).toBeNull()
  })

  it('never throws, even when the site URL is unavailable', async () => {
    vi.stubGlobal('localizedSiteUrl', () => {
      throw new Error('Payment unavailable')
    })
    const { client } = makeClient()
    expect(await createLoginLink(client, { customerId: CUSTOMER_ID, locale: 'fr' })).toBeNull()
  })
})
