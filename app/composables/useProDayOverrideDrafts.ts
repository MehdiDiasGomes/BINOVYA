import type {
  ProDayOverrideDrafts,
  ProDayOverrideDraftsSource,
  ProDayOverview,
} from '@/types/proAvailability'

import { isNotableDay } from '@/utils/proAvailability'

/**
 * Holds the drafts of the day override form and resets them from the stored day: when the date
 * changes, and once the day is refreshed after a save or a removal. A response for a date the
 * admin has since left does not reset the drafts of the date now shown.
 * @param source - Getters for the selected date and its stored day
 * @returns Draft refs, field errors, feedback and the post-save reset
 */
export const useProDayOverrideDrafts = (
  source: ProDayOverrideDraftsSource,
): ProDayOverrideDrafts => {
  const capacityDraft: Ref<number | null> = ref(null)
  const noteDraft: Ref<string> = ref('')
  const sectorAddress: ProDayOverrideDrafts['sectorAddress'] = ref(null)
  const isStoredSectorRemoved: Ref<boolean> = ref(false)
  const capacityError: Ref<string> = ref('')
  const sectorError: Ref<string> = ref('')
  const feedback: Ref<string> = ref('')
  let isResetPending: boolean = false

  const resetDrafts = (): void => {
    const day: ProDayOverview | null = source.day()
    capacityDraft.value = day?.capacitySource === 'override' ? day.capacity : null
    noteDraft.value = day?.note ?? ''
    sectorAddress.value = null
    isStoredSectorRemoved.value = false
    capacityError.value = ''
    sectorError.value = ''
  }

  watch(
    source.date,
    (): void => {
      isResetPending = false
      feedback.value = ''
      resetDrafts()
    },
    { immediate: true },
  )

  watch(capacityDraft, (): void => {
    capacityError.value = ''
  })

  watch(source.day, (): void => {
    if (isResetPending) {
      isResetPending = false
      resetDrafts()
    }
  })

  const resetAfterRefresh = (date: string, savedDay: ProDayOverview | null): void => {
    if (source.date() !== date) {
      return
    }
    if (!source.day() && !(savedDay && isNotableDay(savedDay))) {
      resetDrafts()
      return
    }
    isResetPending = true
  }

  return {
    capacityDraft,
    noteDraft,
    sectorAddress,
    isStoredSectorRemoved,
    capacityError,
    sectorError,
    feedback,
    resetAfterRefresh,
  }
}
