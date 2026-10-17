import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAdminLoginLink } from '../../../server/utils/loginLink'

import type { Database } from '../../../app/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

type FakeOptions = {
  user?: { email: string; app_metadata: Record<string, unknown> } | null
  hashedToken?: string | null
  lookupError?: boolean
  generateError?: { code: string } | null
}

const ADMIN_ID = '99999999-2222-3333-4444-555555555555'

const ADMIN_USER = { email: 'Admin@Binovya.test', app_metadata: { role: 'admin' } }

type FakeClient = { client: SupabaseClient<Database>; generate: ReturnType<typeof vi.fn> }

const makeClient = (options: FakeOptions = {}): FakeClient => {
  const hashedToken: string | null =
    options.hashedToken === undefined ? 'hash_admin' : options.hashedToken
  const generate = vi.fn().mockResolvedValue({
    data: { properties: { hashed_token: hashedToken } },
    error: options.generateError ?? null,
  })
  const client = {
    auth: {
      admin: {
        getUserById: async () =>
          options.lookupError
            ? { data: { user: null }, error: { code: 'unexpected_failure' } }
            : {
                data: { user: options.user === undefined ? ADMIN_USER : options.user },
                error: null,
              },
        generateLink: generate,
      },
    },
  } as unknown as SupabaseClient<Database>
  return { client, generate }
}

beforeEach(() => {
  vi.stubGlobal('localizedSiteUrl', (locale: string, path: string): string => {
    const prefix: string = locale === 'fr' ? '' : '/' + locale
    return 'https://binovya.fr' + prefix + path
  })
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('createAdminLoginLink', () => {
  it('puts the token in the fragment of the French Pro confirm page', async () => {
    const { client } = makeClient()
    const link = await createAdminLoginLink(client, ADMIN_ID, 'fr')
    expect(link?.url).toBe('https://binovya.fr/pro/confirm#token_hash=hash_admin')
  })

  it('never puts the token in the query string', async () => {
    const { client } = makeClient()
    const link = await createAdminLoginLink(client, ADMIN_ID, 'fr')
    expect(new URL(link?.url ?? '').search).toBe('')
  })

  it('prefixes the confirm page with /en for an English request', async () => {
    const { client } = makeClient()
    const link = await createAdminLoginLink(client, ADMIN_ID, 'en')
    expect(link?.url).toBe('https://binovya.fr/en/pro/confirm#token_hash=hash_admin')
  })

  it('generates the link for the normalized email of the account and returns it', async () => {
    const { client, generate } = makeClient()
    const link = await createAdminLoginLink(client, ADMIN_ID, 'fr')
    expect(generate).toHaveBeenCalledWith({ type: 'magiclink', email: 'admin@binovya.test' })
    expect(link?.email).toBe('admin@binovya.test')
  })

  it('returns null and generates nothing when the account lost its admin role', async () => {
    const { client, generate } = makeClient({
      user: { email: 'admin@binovya.test', app_metadata: {} },
    })
    expect(await createAdminLoginLink(client, ADMIN_ID, 'fr')).toBeNull()
    expect(generate).not.toHaveBeenCalled()
  })

  it('returns null when the account does not exist', async () => {
    const { client, generate } = makeClient({ user: null })
    expect(await createAdminLoginLink(client, ADMIN_ID, 'fr')).toBeNull()
    expect(generate).not.toHaveBeenCalled()
  })

  it('returns null, generates nothing and logs when the auth read fails', async () => {
    const { client, generate } = makeClient({ lookupError: true })
    expect(await createAdminLoginLink(client, ADMIN_ID, 'fr')).toBeNull()
    expect(generate).not.toHaveBeenCalled()
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).toContain('auth user lookup failed')
  })

  it('logs the account id but never the email', async () => {
    const { client } = makeClient({ user: { email: 'admin@binovya.test', app_metadata: {} } })
    await createAdminLoginLink(client, ADMIN_ID, 'fr')
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls)
    expect(logged).toContain(ADMIN_ID)
    expect(logged).not.toContain('binovya.test')
  })

  it('returns null when Supabase gives no hashed token or an error', async () => {
    expect(
      await createAdminLoginLink(makeClient({ hashedToken: null }).client, ADMIN_ID, 'fr'),
    ).toBeNull()
    expect(
      await createAdminLoginLink(
        makeClient({ generateError: { code: 'over_email_send_rate_limit' } }).client,
        ADMIN_ID,
        'fr',
      ),
    ).toBeNull()
  })

  it('never throws, even when the site URL is unavailable', async () => {
    vi.stubGlobal('localizedSiteUrl', () => {
      throw new Error('Payment unavailable')
    })
    expect(await createAdminLoginLink(makeClient().client, ADMIN_ID, 'fr')).toBeNull()
  })
})
