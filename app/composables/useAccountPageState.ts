import type { AccountPageState, AccountPageStateOptions } from '@/types/accountPage'
import type { FocusTarget } from '@/types/button'

/**
 * Shares the loading state of a customer or BINOVYA Pro area page, moves focus to its title once
 * the first load settles, expires the customer session when the server answers 401, or calls
 * `onAuthError` on 401 and 403 when given, and reloads on demand, focusing the loaded content or
 * the retry button when the error persists. With `hasContent`, a refresh keeps the loaded content
 * on screen: the page is loading only while it has nothing to show.
 * @param options - Fetch state of the page, the elements to focus, whether the content loaded,
 * whether content is on screen and the optional authentication error handler
 * @returns Loading flag, mounted flag to fill live regions client side, and the reload action
 */
export const useAccountPageState = (options: AccountPageStateOptions): AccountPageState => {
  const { expireSession } = useCustomerSession()
  const isMounted: Ref<boolean> = ref(false)
  const hasFocusedTitle: Ref<boolean> = ref(false)

  const isLoading: ComputedRef<boolean> = computed(
    () =>
      (options.status.value === 'idle' || options.status.value === 'pending') &&
      !options.hasContent?.value,
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
    const statusCode: number | undefined = options.error.value?.statusCode
    if (options.onAuthError && (statusCode === 401 || statusCode === 403)) {
      await options.onAuthError(statusCode)
      return
    }
    if (statusCode === 401) {
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
      const target: FocusTarget | null = options.hasLoaded.value
        ? loadedTarget
        : options.retryRef.value
      target?.focus()
    }
  }

  return { isLoading, isMounted, reload }
}
