import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { H3Event } from 'h3'

type HttpError = Error & { statusCode: number }

let claims: Record<string, unknown> | null = null

const signOutMock = vi.fn()

const waitUntil = vi.fn()

vi.mock('#supabase/server', () => ({
  serverSupabaseUser: async (): Promise<unknown> => {
    if (claims === null) {
      throw new Error('no session')
    }
    return claims
  },
  serverSupabaseSession: async (): Promise<unknown> => ({ access_token: 'jwt-admin' }),
  serverSupabaseServiceRole: (): unknown => ({ auth: { admin: { signOut: signOutMock } } }),
}))

const now = (): number => Math.floor(Date.now() / 1000)

const adminClaims = (method: string, ageSeconds: number): Record<string, unknown> => ({
  sub: 'a1',
  app_metadata: { role: 'admin' },
  amr: [{ method, timestamp: now() - ageSeconds }],
})

const call = async (): Promise<string | number> => {
  vi.resetModules()
  const { requireAdmin } = await import('../../../server/utils/adminSession')
  return requireAdmin({ waitUntil } as unknown as H3Event).then(
    id => id,
    (error: HttpError) => error.statusCode,
  )
}

beforeEach(() => {
  signOutMock.mockResolvedValue({ error: null })
  vi.stubGlobal('createError', (options: { statusCode: number }) =>
    Object.assign(new Error('http'), options),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  claims = null
  signOutMock.mockReset()
  waitUntil.mockReset()
})

describe('requireAdmin', () => {
  it('returns the id of an admin signed in with a login link a minute ago', async () => {
    claims = adminClaims('otp', 60)
    expect(await call()).toBe('a1')
  })

  it('answers 401 without session', async () => {
    claims = null
    expect(await call()).toBe(401)
  })

  it('answers 403 for a customer session, even a fresh one', async () => {
    claims = { sub: 'c1', amr: [{ method: 'otp', timestamp: now() }] }
    expect(await call()).toBe(403)
  })

  it('answers 403 when the role is only in user_metadata', async () => {
    claims = {
      sub: 'c1',
      user_metadata: { role: 'admin' },
      amr: [{ method: 'otp', timestamp: now() }],
    }
    expect(await call()).toBe(403)
  })

  it('does not revoke the session of a customer refused with 403', async () => {
    claims = { sub: 'c1', amr: [{ method: 'otp', timestamp: now() }] }
    await call()
    expect(waitUntil).not.toHaveBeenCalled()
    expect(signOutMock).not.toHaveBeenCalled()
  })

  it('answers 401 for an admin signed in more than 7 days ago', async () => {
    claims = adminClaims('otp', 7 * 86400 + 60)
    expect(await call()).toBe(401)
  })

  it('answers 401 for an admin session opened by password', async () => {
    claims = adminClaims('password', 0)
    expect(await call()).toBe(401)
  })

  it('revokes every session of an expired admin in the background', async () => {
    claims = adminClaims('otp', 8 * 86400)
    expect(await call()).toBe(401)
    expect(waitUntil).toHaveBeenCalledTimes(1)
    expect(waitUntil.mock.calls[0]?.[0]).toBeInstanceOf(Promise)
    await vi.waitFor(() => expect(signOutMock).toHaveBeenCalledWith('jwt-admin', 'global'))
  })

  it('revokes the session of an admin who signed in by password', async () => {
    claims = adminClaims('password', 0)
    expect(await call()).toBe(401)
    await vi.waitFor(() => expect(signOutMock).toHaveBeenCalledWith('jwt-admin', 'global'))
  })

  it('does not revoke anything for an active admin', async () => {
    claims = adminClaims('magiclink', 60)
    await call()
    expect(waitUntil).not.toHaveBeenCalled()
    expect(signOutMock).not.toHaveBeenCalled()
  })
})
