import type { AccountPageState, AccountPageStateOptions } from '@/types/accountPage'

/**
 * Shares the loading state of a customer area page, moves focus to its title once the first load
 * settles, expires the session when the server answers 401 and reloads on demand, focusing the
 * loaded content or the retry button when the error persists.
 * @param options - Fetch state of the page, the elements to focus and whether the content loaded
 * @returns Loading flag, mounted flag to fill live regions client side, and the reload action
 */
export const useAccountPageState = (options: AccountPageStateOptions): AccountPageState => {
  const { expireSession } = useCustomerSession()
  const isMounted: Ref<boolean> = ref(false)
  const hasFocusedTitle: Ref<boolean> = ref(false)

  const isLoading: ComputedRef<boolean> = computed(
    () => options.status.value === 'idle' || options.status.value === 'pending',
  )

  const focusTitleOnce = async (): Promise<void> => {
    if (!isMounted.value || hasFocusedTitle.value || isLoading.value) {
      return
    }
    await nextTick()
    if (!options.titleRef.value || hasFocusedTitle.value) {
      return
    }
    options.titleRef.value.focus()
    hasFocusedTitle.value = true
  }

  watch(options.error, async (): Promise<void> => {
    if (options.error.value?.statusCode === 401) {
      await expireSession()
    }
  })

  watch(isLoading, focusTitleOnce)

  onMounted(async (): Promise<void> => {
    isMounted.value = true
    await focusTitleOnce()
  })

  const reload = async (): Promise<void> => {
    try {
      await options.refresh()
    } finally {
      await nextTick()
      const loadedTarget: HTMLElement | null = (options.loadedFocusRef ?? options.titleRef).value
      const target: HTMLElement | null = options.hasLoaded.value
        ? loadedTarget
        : options.retryRef.value
      target?.focus()
    }
  }

  return { isLoading, isMounted, reload }
}
