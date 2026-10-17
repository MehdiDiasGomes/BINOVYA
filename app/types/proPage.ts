import type { AsyncDataRequestStatus } from '#app'
import type ProInterventionList from '@/components/pro/ProInterventionList.vue'
import type { FetchError } from 'ofetch'
import type { ComputedRef, Ref } from 'vue'

export type ProPageStateOptions = {
  data: Readonly<Ref<unknown>>
  status: Readonly<Ref<AsyncDataRequestStatus>>
  error: Readonly<Ref<FetchError | undefined>>
  refresh: () => Promise<void>
}

export type ProPageState = {
  titleRef: Ref<HTMLElement | null>
  listTitleRef: Ref<HTMLElement | null>
  listRef: Ref<InstanceType<typeof ProInterventionList> | null>
  hasError: ComputedRef<boolean>
  hasLoaded: ComputedRef<boolean>
  isLoading: ComputedRef<boolean>
  isMounted: Readonly<Ref<boolean>>
  reload: () => Promise<void>
}
