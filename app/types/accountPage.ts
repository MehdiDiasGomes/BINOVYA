import type { AsyncDataRequestStatus } from '#app'
import type { FetchError } from 'ofetch'
import type { ComputedRef, Ref } from 'vue'

export type AccountPageStateOptions = {
  status: Readonly<Ref<AsyncDataRequestStatus>>
  error: Readonly<Ref<FetchError | undefined>>
  refresh: () => Promise<void>
  titleRef: Readonly<Ref<HTMLElement | null>>
  retryRef: Readonly<Ref<HTMLButtonElement | null>>
  hasLoaded: Readonly<Ref<boolean>>
  loadedFocusRef?: Readonly<Ref<HTMLElement | null>>
}

export type AccountPageState = {
  isLoading: ComputedRef<boolean>
  isMounted: Readonly<Ref<boolean>>
  reload: () => Promise<void>
}
