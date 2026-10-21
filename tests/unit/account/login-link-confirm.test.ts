import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { useLoginLinkConfirm } from '../../../app/composables/useLoginLinkConfirm'
import { stubLocalePath, stubVueGlobals } from '../../support/vue-globals'

import type { LoginLinkConfirmState } from '../../../app/types/loginPage'

type Listener = () => void

const verifyOtp = vi.fn()

const navigateTo = vi.fn()

const replaceState = vi.fn()

const focus = vi.fn()

const listeners = new Map<string, Listener>()

const location = { hash: '', pathname: '/account/confirm', search: '' }

const failedTitleRef = ref<HTMLElement | null>(null)

type Run = {
  state: LoginLinkConfirmState
  mount: () => Promise<void>
  unmount: () => void
}

const run = async (options: { isLoggedIn: boolean; targetPath?: string }): Promise<Run> => {
  const globals = stubVueGlobals()
  const state = useLoginLinkConfirm({
    targetPath: options.targetPath ?? '/account',
    isLoggedIn: ref(options.isLoggedIn),
    failedTitleRef,
  })
  await globals.mount()
  await vi.waitFor(() => {
    expect(navigateTo.mock.calls.length + (state.hasFailed.value ? 1 : 0)).toBeGreaterThan(0)
  })
  return { state, ...globals }
}

beforeEach(() => {
  location.hash = ''
  listeners.clear()
  verifyOtp.mockReset().mockResolvedValue({ error: null })
  navigateTo.mockReset().mockResolvedValue(undefined)
  replaceState.mockReset()
  focus.mockReset()
  failedTitleRef.value = { focus } as unknown as HTMLElement
  stubLocalePath('fr')
  vi.stubGlobal('navigateTo', navigateTo)
  vi.stubGlobal('useSupabaseClient', () => ({ auth: { verifyOtp } }))
  vi.stubGlobal('window', {
    location,
    history: { state: null, replaceState },
    addEventListener: (name: string, listener: Listener) => listeners.set(name, listener),
    removeEventListener: (name: string) => listeners.delete(name),
  })
})

describe('useLoginLinkConfirm', () => {
  it('verifies the token of the fragment as an email OTP and opens the area', async () => {
    location.hash = '#token_hash=abc123'
    await run({ isLoggedIn: false })
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc123', type: 'email' })
    expect(navigateTo).toHaveBeenCalledWith('/account', { replace: true })
  })

  it('still accepts an old link carrying type=magiclink in its fragment', async () => {
    location.hash = '#token_hash=abc123&type=magiclink'
    await run({ isLoggedIn: false })
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc123', type: 'email' })
    expect(navigateTo).toHaveBeenCalledWith('/account', { replace: true })
  })

  it('removes the token from the address bar before verifying it', async () => {
    location.hash = '#token_hash=abc123'
    await run({ isLoggedIn: false })
    expect(replaceState).toHaveBeenCalledWith(null, '', '/account/confirm')
  })

  it('opens the English area from an English confirm page', async () => {
    stubLocalePath('en')
    location.hash = '#token_hash=abc123'
    await run({ isLoggedIn: false, targetPath: '/account' })
    expect(navigateTo).toHaveBeenCalledWith('/en/account', { replace: true })
  })

  it('shows the failure and focuses its title when the token is dead', async () => {
    location.hash = '#token_hash=deadbeef&type=magiclink'
    verifyOtp.mockResolvedValue({ error: { message: 'expired' } })
    const { state } = await run({ isLoggedIn: false })
    expect(state.hasFailed.value).toBe(true)
    expect(navigateTo).not.toHaveBeenCalled()
    expect(focus).toHaveBeenCalledTimes(1)
  })

  it('shows the failure when the page is opened without a token', async () => {
    const { state } = await run({ isLoggedIn: false })
    expect(state.hasFailed.value).toBe(true)
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it('shows the failure when the verification throws', async () => {
    location.hash = '#token_hash=abc123'
    verifyOtp.mockRejectedValue(new TypeError('Failed to fetch'))
    const { state } = await run({ isLoggedIn: false })
    expect(state.hasFailed.value).toBe(true)
  })

  it('goes to the area of a logged-in visitor opening a used link', async () => {
    location.hash = '#token_hash=used'
    verifyOtp.mockResolvedValue({ error: { message: 'used' } })
    const { state } = await run({ isLoggedIn: true })
    expect(state.hasFailed.value).toBe(false)
    expect(navigateTo).toHaveBeenCalledWith('/account', { replace: true })
  })

  it('goes to the area of a logged-in visitor opening the page without a token', async () => {
    const { state } = await run({ isLoggedIn: true })
    expect(state.hasFailed.value).toBe(false)
    expect(navigateTo).toHaveBeenCalledWith('/account', { replace: true })
  })

  it('listens to fragment changes while mounted only', async () => {
    location.hash = '#token_hash=abc123'
    const { unmount } = await run({ isLoggedIn: false })
    expect(listeners.has('hashchange')).toBe(true)
    unmount()
    expect(listeners.has('hashchange')).toBe(false)
  })
})
