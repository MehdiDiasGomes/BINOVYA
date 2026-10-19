import type { FocusTarget } from '@/types/button'
import type { ProRescheduledEvent } from '@/types/proAvailability'
import type { ProPageState, ProPageStateOptions } from '@/types/proPage'

import { formatFullDate } from '@/utils/date'
import { overriddenReasonsText } from '@/utils/proAvailability'
import { proCustomerName } from '@/utils/proIntervention'

/**
 * Shares the loading, error and focus handling of a BINOVYA Pro list page on top of
 * `useAccountPageState`: focus on the title after the first load, on the list title or the retry
 * button after a reload, back to the Pro login with the session expired notice on 401, without
 * it on 403. After an intervention is moved, it announces the result with the refusals that were
 * forced, reloads the list and focuses the list title, since the card may leave the list.
 * @param options - Fetch state of the page
 * @returns Element refs to bind in the template, error and loading flags, the reload action, the
 * action notice and the handler of a move
 */
export const useProPageState = (options: ProPageStateOptions): ProPageState => {
  const { t, locale } = useI18n()
  const { handleAuthStatus } = useProAuthError()
  const titleRef: Ref<HTMLElement | null> = ref(null)
  const listTitleRef: Ref<HTMLElement | null> = ref(null)
  const listRef: ProPageState['listRef'] = ref(null)
  const { message: actionNotice, announce, clear } = useLiveAnnouncement()
  let isRefreshingAfterAction: boolean = false

  const retryRef: ComputedRef<FocusTarget | null> = computed(
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
    onAuthError: async (statusCode: number): Promise<void> => {
      await handleAuthStatus(statusCode)
    },
  })

  watch(isLoading, (loading: boolean): void => {
    if (loading && !isRefreshingAfterAction) {
      clear()
    }
  })

  const announceAndReload = async (notice: string): Promise<void> => {
    await announce(notice)
    isRefreshingAfterAction = true
    try {
      await reload()
    } finally {
      isRefreshingAfterAction = false
    }
  }

  const handleRescheduled = async (moved: ProRescheduledEvent): Promise<void> => {
    const success: string = t('pro.reschedule.success', {
      name: proCustomerName(moved.intervention.customer, t),
      date: formatFullDate(moved.newDate, locale.value),
    })
    const forced: string = overriddenReasonsText(moved.overriddenCodes, locale.value, t)
    await announceAndReload(forced ? `${success} ${forced}` : success)
  }

  return {
    titleRef,
    listTitleRef,
    listRef,
    hasError,
    hasLoaded,
    isLoading,
    isMounted,
    reload,
    actionNotice,
    handleRescheduled,
  }
}
