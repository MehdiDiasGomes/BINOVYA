import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { H3Event } from 'h3'

type HttpError = Error & { statusCode: number }

let claims: Record<string, unknown> | null = null

const signOutMock = vi.fn()

vi.mock('#supabase/server', () => ({
  serverSupabaseUser: async (): Promise<unknown> => {
    if (claims === null) {
      throw new Error('no session')
    }
    return claims
  },
  serverSupabaseSession: async (): Promise<unknown> => ({ access_token: 'jwt-123' }),
  serverSupabaseServiceRole: (): unknown => ({ auth: { admin: { signOut: signOutMock } } }),
}))

const now = (): number => Math.floor(Date.now() / 1000)

const call = async (event: object = {}): Promise<string | number> => {
  vi.resetModules()
  const { requireCustomerId } = await import('../../../server/utils/customerSession')
  return requireCustomerId(event as H3Event).then(
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
})

describe('requireCustomerId', () => {
  it('returns the id of a session signed in a minute ago', async () => {
    claims = { sub: 'c1', amr: [{ method: 'otp', timestamp: now() - 60 }] }
    expect(await call()).toBe('c1')
  })

  it('answers 401 when the sign-in is older than 7 days', async () => {
    claims = { sub: 'c1', amr: [{ method: 'otp', timestamp: now() - 7 * 86400 - 60 }] }
    expect(await call()).toBe(401)
  })

  it('answers 401 when amr is missing', async () => {
    claims = { sub: 'c1' }
    expect(await call()).toBe(401)
  })

  it('answers 401 when the session is not valid', async () => {
    claims = null
    expect(await call()).toBe(401)
  })

  it('answers 401 without a subject', async () => {
    claims = { amr: [{ method: 'otp', timestamp: now() }] }
    expect(await call()).toBe(401)
  })

  it('revokes all sessions of an expired sign-in with the access token', async () => {
    claims = { sub: 'c1', amr: [{ method: 'otp', timestamp: now() - 8 * 86400 }] }
    expect(await call()).toBe(401)
    await vi.waitFor(() => expect(signOutMock).toHaveBeenCalledWith('jwt-123', 'global'))
  })

  it('does not revoke anything for a fresh sign-in', async () => {
    claims = { sub: 'c1', amr: [{ method: 'otp', timestamp: now() - 60 }] }
    expect(await call()).toBe('c1')
    expect(signOutMock).not.toHaveBeenCalled()
  })

  it('does not revoke anything without a session', async () => {
    claims = null
    expect(await call()).toBe(401)
    expect(signOutMock).not.toHaveBeenCalled()
  })

  it('still answers 401 when the revocation fails', async () => {
    signOutMock.mockRejectedValue(new Error('down'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    claims = { sub: 'c1', amr: [{ method: 'otp', timestamp: now() - 8 * 86400 }] }
    expect(await call()).toBe(401)
  })

  it('schedules the revocation with waitUntil when the runtime offers it', async () => {
    claims = { sub: 'c1', amr: [{ method: 'otp', timestamp: now() - 8 * 86400 }] }
    const waitUntil = vi.fn()
    expect(await call({ waitUntil })).toBe(401)
    expect(waitUntil).toHaveBeenCalledTimes(1)
    expect(waitUntil.mock.calls[0]?.[0]).toBeInstanceOf(Promise)
    await vi.waitFor(() => expect(signOutMock).toHaveBeenCalledWith('jwt-123', 'global'))
  })

  it('does not call waitUntil for a fresh sign-in', async () => {
    claims = { sub: 'c1', amr: [{ method: 'otp', timestamp: now() }] }
    const waitUntil = vi.fn()
    expect(await call({ waitUntil })).toBe('c1')
    expect(waitUntil).not.toHaveBeenCalled()
  })
})
