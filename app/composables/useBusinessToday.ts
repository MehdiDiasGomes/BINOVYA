import { businessToday } from '@/utils/date'

/**
 * Holds today's date in the business time zone and refreshes it when the tab becomes visible
 * again, so a page left open overnight on the round phone moves to the new day.
 * @returns Today's ISO calendar date
 */
export const useBusinessToday = (): Readonly<Ref<string>> => {
  const today: Ref<string> = ref(businessToday())

  const refresh = (): void => {
    if (document.visibilityState === 'visible') {
      today.value = businessToday()
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', refresh)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', refresh)
  })

  return readonly(today)
}
