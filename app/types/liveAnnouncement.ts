import type { Ref } from 'vue'

export type LiveAnnouncement = {
  message: Readonly<Ref<string>>
  announce: (text: string) => Promise<void>
  clear: () => void
}
