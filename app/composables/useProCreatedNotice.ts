import type { ProCreatedNoticeState } from '@/types/proCreateForm'

import { PRO_CREATED_NOTICE_KEY } from '@/constants/proCreate'

/**
 * Carries the result of an intervention creation from the BINOVYA Pro form to the page of the
 * new intervention, which announces it once loaded, since the form unmounts with its live region.
 * @returns The action storing the notice and the one announcing it after the next load
 */
export const useProCreatedNotice = (): ProCreatedNoticeState => {
  const notice: Ref<string> = useState<string>(PRO_CREATED_NOTICE_KEY, () => '')

  const remember = (text: string): void => {
    notice.value = text
  }

  const announceOnLoad: ProCreatedNoticeState['announceOnLoad'] = (isLoading, announce) => {
    watch(
      isLoading,
      async (loading: boolean): Promise<void> => {
        const text: string = notice.value
        if (loading || !text) {
          return
        }
        notice.value = ''
        await announce(text)
      },
      { immediate: true },
    )
  }

  return { remember, announceOnLoad }
}
