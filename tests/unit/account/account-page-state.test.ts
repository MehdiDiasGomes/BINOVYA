import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { ref, type Ref } from 'vue'

import { useAccountPageState } from '../../../app/composables/useAccountPageState'
import { stubVueGlobals } from '../../support/vue-globals'

import type { AccountPageState, AccountPageStateOptions } from '../../../app/types/accountPage'

type FetchStatus = 'idle' | 'pending' | 'success' | 'error'

const expireSession = vi.fn()

const titleFocus = vi.fn()

const retryFocus = vi.fn()

type Build = {
  status: Ref<FetchStatus>
  error: Ref<{ statusCode: number } | undefined>
  hasLoaded: Ref<boolean>
  refresh: Mock
  state: AccountPageState
  mount: () => Promise<void>
  unmount: () => void
}

const build = (patch: { onAuthError?: (code: number) => Promise<void> } = {}): Build => {
  const status = ref<FetchStatus>('pending')
  const error = ref<{ statusCode: number } | undefined>(undefined)
  const hasLoaded = ref(false)
  const refresh = vi.fn().mockResolvedValue(undefined)
  const globals = stubVueGlobals()
  const state = useAccountPageState({
    status,
    error,
    refresh,
    titleRef: ref({ focus: titleFocus } as unknown as HTMLElement),
    retryRef: ref({ focus: retryFocus }),
    hasLoaded,
    ...patch,
  } as unknown as AccountPageStateOptions)
  return { status, error, hasLoaded, refresh, state, ...globals }
}

beforeEach(() => {
  expireSession.mockReset().mockResolvedValue(undefined)
  titleFocus.mockReset()
  retryFocus.mockReset()
  vi.stubGlobal('useCustomerSession', () => ({ expireSession }))
})

describe('useAccountPageState', () => {
  it('is loading while the first request is pending', () => {
    expect(build().state.isLoading.value).toBe(true)
  })

  it('focuses the title once the first load settles', async () => {
    const { status, mount, state } = build()
    await mount()
    expect(titleFocus).not.toHaveBeenCalled()
    status.value = 'success'
    await vi.waitFor(() => expect(titleFocus).toHaveBeenCalledTimes(1))
    expect(state.isLoading.value).toBe(false)
  })

  it('focuses the title only once', async () => {
    const { status, mount } = build()
    await mount()
    status.value = 'success'
    await vi.waitFor(() => expect(titleFocus).toHaveBeenCalledTimes(1))
    status.value = 'pending'
    status.value = 'success'
    await Promise.resolve()
    expect(titleFocus).toHaveBeenCalledTimes(1)
  })

  it('expires the customer session when the server answers 401', async () => {
    const { error } = build()
    error.value = { statusCode: 401 }
    await vi.waitFor(() => expect(expireSession).toHaveBeenCalledTimes(1))
  })

  it('keeps the session on another server error', async () => {
    const { error } = build()
    error.value = { statusCode: 500 }
    await Promise.resolve()
    expect(expireSession).not.toHaveBeenCalled()
  })

  it('hands 401 and 403 to onAuthError instead of expiring the session', async () => {
    const onAuthError = vi.fn().mockResolvedValue(undefined)
    const { error } = build({ onAuthError })
    error.value = { statusCode: 403 }
    await vi.waitFor(() => expect(onAuthError).toHaveBeenCalledWith(403))
    expect(expireSession).not.toHaveBeenCalled()
  })

  it('reloads and moves focus to the title once the list loaded', async () => {
    const { hasLoaded, refresh, state } = build()
    hasLoaded.value = true
    await state.reload()
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(titleFocus).toHaveBeenCalledTimes(1)
    expect(retryFocus).not.toHaveBeenCalled()
  })

  it('keeps the focus on the retry button while the list still fails', async () => {
    const { refresh, state } = build()
    await state.reload()
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(retryFocus).toHaveBeenCalledTimes(1)
    expect(titleFocus).not.toHaveBeenCalled()
  })

  it('moves the focus even when the reload throws', async () => {
    const { refresh, state } = build()
    refresh.mockRejectedValue(new Error('down'))
    await expect(state.reload()).rejects.toThrow('down')
    expect(retryFocus).toHaveBeenCalledTimes(1)
  })
})
