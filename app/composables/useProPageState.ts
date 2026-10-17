import type { ProPageState, ProPageStateOptions } from '@/types/proPage'

/**
 * Shares the loading, error and focus handling of a BINOVYA Pro list page on top of
 * `useAccountPageState`: focus on the title after the first load, on the list title or the retry
 * button after a reload, back to the Pro login with the session expired notice on 401, without
 * it on 403.
 * @param options - Fetch state of the page
 * @returns Element refs to bind in the template, error and loading flags and the reload action
 */
export const useProPageState = (options: ProPageStateOptions): ProPageState => {
  const { leave, expire } = useAdminSession()
  const titleRef: Ref<HTMLElement | null> = ref(null)
  const listTitleRef: Ref<HTMLElement | null> = ref(null)
  const listRef: ProPageState['listRef'] = ref(null)

  const retryRef: ComputedRef<HTMLButtonElement | null> = computed(
    () => listRef.value?.retryButton ?? null,
  )

  const hasError: ComputedRef<boolean> = computed(
    () => Boolean(options.error.value) || !options.data.value,
  )

  const hasLoaded: ComputedRef<boolean> = computed(() => !hasError.value)

  const { isLoading, isMounted, reload } = useAccountPageState({
    status: options.status,
    error: options.error,
    refresh: options.refresh,
    titleRef,
    retryRef,
    hasLoaded,
    loadedFocusRef: listTitleRef,
    onAuthError: (statusCode: number): Promise<void> => (statusCode === 401 ? expire() : leave()),
  })

  return { titleRef, listTitleRef, listRef, hasError, hasLoaded, isLoading, isMounted, reload }
}
