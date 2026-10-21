import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { useCustomerSession } from '../../../app/composables/useCustomerSession'
import { SESSION_EXPIRED_QUERY, SIGN_OUT_TIMEOUT_MS } from '../../../app/constants/account'
import { ADMIN_ROLE, PRO_HOME_PATH } from '../../../app/constants/pro'
import { stubLocalePath, stubVueGlobals } from '../../support/vue-globals'

import type { AuthError } from '@supabase/supabase-js'

const NOW_MS = Date.UTC(2026, 9, 21, 12)

const DAY_SECONDS = 24 * 3600

const claimsSignedIn = (secondsAgo: number, extra: object = {}): object => ({
  amr: [{ method: 'otp', timestamp: NOW_MS / 1000 - secondsAgo }],
  ...extra,
})

const signOut = vi.fn<(options: { scope: string }) => Promise<{ error: AuthError | null }>>()

const navigateTo = vi.fn()

const session = ref<object | null>(null)

const user = ref<object | null>(null)

beforeEach(() => {
  vi.useFakeTimers({ now: NOW_MS })
  stubVueGlobals()
  stubLocalePath('fr')
  session.value = null
  user.value = null
  signOut.mockReset().mockResolvedValue({ error: null })
  navigateTo.mockReset().mockResolvedValue(undefined)
  vi.stubGlobal('useSupabaseSession', () => session)
  vi.stubGlobal('useSupabaseUser', () => user)
  vi.stubGlobal('useSupabaseClient', () => ({ auth: { signOut } }))
  vi.stubGlobal('navigateTo', navigateTo)
})

describe('useCustomerSession status', () => {
  it('is none without session nor user', () => {
    expect(useCustomerSession().status.value).toBe('none')
  })

  it('is active for a session signed in a minute ago', () => {
    user.value = claimsSignedIn(60)
    expect(useCustomerSession().status.value).toBe('active')
  })

  it('is expired once the sign-in is older than 7 days', () => {
    user.value = claimsSignedIn(7 * DAY_SECONDS + 1)
    expect(useCustomerSession().status.value).toBe('expired')
  })

  it('is expired for a session without a readable sign-in time', () => {
    user.value = { amr: [] }
    expect(useCustomerSession().status.value).toBe('expired')
  })

  it('is admin for the admin role, even past 7 days', () => {
    user.value = claimsSignedIn(30 * DAY_SECONDS, { app_metadata: { role: ADMIN_ROLE } })
    expect(useCustomerSession().status.value).toBe('admin')
  })

  it('reads the claims from the access token when the user is not loaded yet', () => {
    const payload = Buffer.from(JSON.stringify(claimsSignedIn(8 * DAY_SECONDS))).toString(
      'base64url',
    )
    session.value = { access_token: `header.${payload}.signature` }
    expect(useCustomerSession().status.value).toBe('expired')
  })
})

describe('useCustomerSession endSession', () => {
  beforeEach(() => {
    session.value = {}
    user.value = claimsSignedIn(60)
  })

  it('revokes every session of the customer and clears the browser state', async () => {
    await useCustomerSession().endSession()
    expect(signOut).toHaveBeenCalledTimes(1)
    expect(signOut).toHaveBeenCalledWith({ scope: 'global' })
    expect(session.value).toBeNull()
    expect(user.value).toBeNull()
  })

  it('falls back to a local sign-out when the logout request is aborted', async () => {
    signOut.mockImplementationOnce(() => Promise.reject(new TypeError('Failed to fetch')))
    await useCustomerSession().endSession()
    expect(signOut).toHaveBeenNthCalledWith(2, { scope: 'local' })
    expect(session.value).toBeNull()
  })

  it('falls back to a local sign-out when Supabase answers an error', async () => {
    signOut.mockResolvedValueOnce({ error: { message: 'down' } as AuthError })
    await useCustomerSession().endSession()
    expect(signOut).toHaveBeenNthCalledWith(2, { scope: 'local' })
  })

  it('gives up waiting for Supabase after the sign-out timeout', async () => {
    signOut.mockImplementationOnce(() => new Promise(() => undefined))
    const ended = useCustomerSession().endSession()
    await vi.advanceTimersByTimeAsync(SIGN_OUT_TIMEOUT_MS - 1)
    expect(signOut).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await ended
    expect(signOut).toHaveBeenNthCalledWith(2, { scope: 'local' })
    expect(session.value).toBeNull()
  })

  it('still clears the browser state when even the local sign-out fails', async () => {
    signOut.mockRejectedValue(new TypeError('Failed to fetch'))
    await useCustomerSession().endSession()
    expect(session.value).toBeNull()
  })
})

describe('useCustomerSession expireSession', () => {
  beforeEach(() => {
    session.value = {}
    user.value = claimsSignedIn(60)
  })

  it('ends the session then replaces the page with the login page and the expired notice', async () => {
    await useCustomerSession().expireSession()
    expect(signOut).toHaveBeenCalledWith({ scope: 'global' })
    expect(navigateTo).toHaveBeenCalledWith(
      { path: '/login', query: { session: SESSION_EXPIRED_QUERY } },
      { replace: true },
    )
  })

  it('goes to the English login page from an English page', async () => {
    stubLocalePath('en')
    await useCustomerSession().expireSession()
    expect(navigateTo).toHaveBeenCalledWith(
      { path: '/en/login', query: { session: SESSION_EXPIRED_QUERY } },
      { replace: true },
    )
  })

  it('sends an admin to BINOVYA Pro without ending the session', async () => {
    user.value = claimsSignedIn(60, { app_metadata: { role: ADMIN_ROLE } })
    await useCustomerSession().expireSession()
    expect(signOut).not.toHaveBeenCalled()
    expect(navigateTo).toHaveBeenCalledWith(PRO_HOME_PATH, { replace: true })
  })
})

describe('useCustomerSession isActive', () => {
  it('follows the status', () => {
    user.value = claimsSignedIn(60)
    const state = useCustomerSession()
    expect(state.isActive.value).toBe(true)
    user.value = claimsSignedIn(8 * DAY_SECONDS)
    expect(state.isActive.value).toBe(false)
  })
})
