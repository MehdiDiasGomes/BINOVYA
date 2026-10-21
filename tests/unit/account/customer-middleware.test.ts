import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed } from 'vue'

import { SESSION_EXPIRED_QUERY } from '../../../app/constants/account'
import { PRO_HOME_PATH } from '../../../app/constants/pro'
import { stubLocalePath, stubVueGlobals } from '../../support/vue-globals'

import type { CustomerSessionStatus } from '../../../app/types/account'

type Middleware = () => Promise<unknown>

const endSession = vi.fn()

const navigateTo = vi.fn((target: unknown, options: unknown) => ({ target, options }))

const useSession = (status: CustomerSessionStatus): void => {
  vi.stubGlobal('useCustomerSession', () => ({
    status: computed(() => status),
    isActive: computed(() => status === 'active'),
    endSession,
    expireSession: vi.fn(),
  }))
}

const load = async (name: 'customer' | 'guest'): Promise<Middleware> => {
  vi.resetModules()
  vi.stubGlobal('defineNuxtRouteMiddleware', (middleware: Middleware) => middleware)
  const module =
    name === 'customer'
      ? await import('../../../app/middleware/customer')
      : await import('../../../app/middleware/guest')
  return module.default as Middleware
}

beforeEach(() => {
  stubVueGlobals()
  stubLocalePath('fr')
  endSession.mockReset().mockResolvedValue(undefined)
  navigateTo.mockClear()
  vi.stubGlobal('navigateTo', navigateTo)
})

describe('customer middleware', () => {
  it('lets an active customer through', async () => {
    useSession('active')
    expect(await (await load('customer'))()).toBeUndefined()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('sends a visitor to /login without notice', async () => {
    useSession('none')
    await (
      await load('customer')
    )()
    expect(navigateTo).toHaveBeenCalledWith({ path: '/login', query: {} }, { replace: true })
    expect(endSession).not.toHaveBeenCalled()
  })

  it('sends a visitor of the English area to /en/login', async () => {
    useSession('none')
    stubLocalePath('en')
    await (
      await load('customer')
    )()
    expect(navigateTo).toHaveBeenCalledWith({ path: '/en/login', query: {} }, { replace: true })
  })

  it('ends an expired session then sends it to /login with the expired notice', async () => {
    useSession('expired')
    await (
      await load('customer')
    )()
    expect(endSession).toHaveBeenCalledTimes(1)
    expect(navigateTo).toHaveBeenCalledWith(
      { path: '/login', query: { session: SESSION_EXPIRED_QUERY } },
      { replace: true },
    )
  })

  it('sends an expired English session to /en/login with the expired notice', async () => {
    useSession('expired')
    stubLocalePath('en')
    await (
      await load('customer')
    )()
    expect(navigateTo).toHaveBeenCalledWith(
      { path: '/en/login', query: { session: SESSION_EXPIRED_QUERY } },
      { replace: true },
    )
  })

  it('sends an admin to BINOVYA Pro without ending the session', async () => {
    useSession('admin')
    await (
      await load('customer')
    )()
    expect(navigateTo).toHaveBeenCalledWith(PRO_HOME_PATH, { replace: true })
    expect(endSession).not.toHaveBeenCalled()
  })
})

describe('guest middleware', () => {
  it('lets a visitor see the login page', async () => {
    useSession('none')
    expect(await (await load('guest'))()).toBeUndefined()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('closes an expired session on the login page and stays there', async () => {
    useSession('expired')
    expect(await (await load('guest'))()).toBeUndefined()
    expect(endSession).toHaveBeenCalledTimes(1)
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('sends an active customer to /account', async () => {
    useSession('active')
    await (
      await load('guest')
    )()
    expect(navigateTo).toHaveBeenCalledWith('/account', { replace: true })
  })

  it('sends an active English customer to /en/account', async () => {
    useSession('active')
    stubLocalePath('en')
    await (
      await load('guest')
    )()
    expect(navigateTo).toHaveBeenCalledWith('/en/account', { replace: true })
  })

  it('sends an admin to BINOVYA Pro', async () => {
    useSession('admin')
    await (
      await load('guest')
    )()
    expect(navigateTo).toHaveBeenCalledWith(PRO_HOME_PATH, { replace: true })
  })
})
