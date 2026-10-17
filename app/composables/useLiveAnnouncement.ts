import type { LiveAnnouncement } from '@/types/liveAnnouncement'

/**
 * Holds the text of a `role="status"` live region. `announce` empties the region before filling
 * it on the next tick, so a message identical to the previous one is read again.
 * @returns Current message, the announce action and a clear action
 */
export const useLiveAnnouncement = (): LiveAnnouncement => {
  const message: Ref<string> = ref('')

  const clear = (): void => {
    message.value = ''
  }

  const announce = async (text: string): Promise<void> => {
    clear()
    await nextTick()
    message.value = text
  }

  return { message, announce, clear }
}
