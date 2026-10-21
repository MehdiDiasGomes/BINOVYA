import type { AsyncDataRequestStatus } from '#app'
import type { FocusTarget } from '@/types/button'
import type { FetchError } from 'ofetch'
import type { ComputedRef, Ref } from 'vue'

export type AccountPageStateOptions = {
  status: Readonly<Ref<AsyncDataRequestStatus>>
  error: Readonly<Ref<FetchError | undefined>>
  refresh: () => Promise<void>
  titleRef: Readonly<Ref<HTMLElement | null>>
  retryRef: Readonly<Ref<FocusTarget | null>>
  hasLoaded: Readonly<Ref<boolean>>
  loadedFocusRef?: Readonly<Ref<HTMLElement | null>>
  hasContent?: Readonly<Ref<boolean>>
  onAuthError?: (statusCode: number) => Promise<void>
}

export type AccountPageState = {
  isLoading: ComputedRef<boolean>
  isMounted: Readonly<Ref<boolean>>
  reload: () => Promise<void>
}
