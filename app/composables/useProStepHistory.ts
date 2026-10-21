import type { ProHistoryDirection, ProHistoryListener, ProInterventionMode } from '@/types/proSteps'
import type { LocationQuery } from 'vue-router'

import { PRO_STEP_QUERY } from '@/constants/proSteps'

type HistorySide = 'back' | 'forward'

const hasHistoryEntry = (side: HistorySide): boolean => {
  const state: unknown = window.history.state
  if (typeof state !== 'object' || state === null) {
    return false
  }
  const location: unknown = Reflect.get(state, side)
  return typeof location === 'string'
}

/**
 * Keeps the phone back and forward buttons useful once the intervention page no longer shows the
 * steps (finished, upcoming or cancelled). A history entry carrying a `step` query, pushed while
 * the steps were shown, is skipped in the direction the admin was going, so one press leaves the
 * page; with no entry left that way, or on any other navigation, the `step` query is removed with
 * `replace`. Nothing is counted, so a reload or the stepper links never put it out of sync.
 * @param mode - Getter of the page mode, null while the intervention is not loaded
 */
export const useProStepHistory = (mode: () => ProInterventionMode | null): void => {
  const route = useRoute()
  const router = useRouter()
  let popDirection: ProHistoryDirection | null = null
  let stopListening: (() => void) | null = null

  const queryWithoutStep = (): LocationQuery =>
    Object.fromEntries(Object.entries(route.query).filter(([key]) => key !== PRO_STEP_QUERY))

  const leaveStepEntry = async (direction: ProHistoryDirection | null): Promise<void> => {
    if (direction === 'back' && hasHistoryEntry('back')) {
      router.back()
      return
    }
    if (direction === 'forward' && hasHistoryEntry('forward')) {
      router.forward()
      return
    }
    await router.replace({ query: queryWithoutStep() })
  }

  onMounted((): void => {
    const listener: ProHistoryListener = (_to, _from, information): void => {
      popDirection = information.direction
    }
    stopListening = router.options.history.listen(listener)
  })

  onBeforeUnmount((): void => {
    stopListening?.()
  })

  watch(
    [(): string => route.fullPath, mode],
    async (): Promise<void> => {
      const direction: ProHistoryDirection | null = popDirection
      popDirection = null
      const current: ProInterventionMode | null = mode()
      if (!current || current === 'steps' || route.query[PRO_STEP_QUERY] === undefined) {
        return
      }
      await leaveStepEntry(direction)
    },
    { flush: 'post', immediate: true },
  )
}
