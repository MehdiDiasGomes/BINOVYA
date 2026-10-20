import type { CalendarVisibleRange } from '@/types/calendar'
import type { ProInterventionDays, ProInterventionDaysState } from '@/types/proInterventionDays'

const rangeKey = (range: CalendarVisibleRange): string => `${range.from}/${range.to}`

const withoutRange = (
  counts: Record<string, number>,
  range: CalendarVisibleRange,
): Record<string, number> =>
  Object.fromEntries(
    Object.entries(counts).filter(
      ([date]: [string, number]) => date < range.from || date > range.to,
    ),
  )

/**
 * Loads the number of interventions per day for the date pickers of BINOVYA Pro, one visible
 * calendar grid at a time. A grid is fetched once, then again after the page data changed. A
 * failure leaves the days unmarked, except an authentication error, handled like the Pro pages.
 * @param source - Page data whose change makes the loaded counts stale, none when the page never
 * changes the interventions while it is open
 * @returns Counts by ISO date and the loader to call with the visible range of a picker
 */
export const useProInterventionDays = (
  source?: Readonly<Ref<unknown>>,
): ProInterventionDaysState => {
  const { handleAuthError } = useProAuthError()
  const markedDays: Ref<Record<string, number>> = ref({})
  const freshRanges: Set<string> = new Set()
  const pendingRequests: Map<string, symbol> = new Map()

  if (source) {
    watch(source, (): void => {
      freshRanges.clear()
      pendingRequests.clear()
    })
  }

  const loadDays = async (range: CalendarVisibleRange): Promise<void> => {
    const key: string = rangeKey(range)
    if (freshRanges.has(key)) {
      return
    }
    freshRanges.add(key)
    const request: symbol = Symbol(key)
    pendingRequests.set(key, request)
    try {
      const response: ProInterventionDays = await $fetch<ProInterventionDays>(
        '/api/pro/interventions/days',
        { query: range },
      )
      if (pendingRequests.get(key) !== request) {
        return
      }
      markedDays.value = {
        ...withoutRange(markedDays.value, range),
        ...Object.fromEntries(response.days.map(day => [day.date, day.count])),
      }
    } catch (error: unknown) {
      if (pendingRequests.get(key) === request) {
        freshRanges.delete(key)
      }
      await handleAuthError(error)
    } finally {
      if (pendingRequests.get(key) === request) {
        pendingRequests.delete(key)
      }
    }
  }

  return { markedDays: readonly(markedDays), loadDays }
}
