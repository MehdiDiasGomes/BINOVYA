import { vi } from 'vitest'
import { computed, nextTick, reactive, ref, watch } from 'vue'

export type LocaleKey = 'fr' | 'en'

/**
 * Stubs the Vue auto-imports of a Nuxt composable with the real Vue ones, mounted hooks being
 * run later through the returned `mount` and `unmount`.
 * @returns Actions running the `onMounted` and `onBeforeUnmount` callbacks registered so far
 */
export const stubVueGlobals = (): { mount: () => Promise<void>; unmount: () => void } => {
  const mounted: (() => unknown)[] = []
  const unmounted: (() => unknown)[] = []
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('reactive', reactive)
  vi.stubGlobal('watch', watch)
  vi.stubGlobal('nextTick', nextTick)
  vi.stubGlobal('onMounted', (callback: () => unknown) => mounted.push(callback))
  vi.stubGlobal('onBeforeUnmount', (callback: () => unknown) => unmounted.push(callback))
  return {
    mount: async (): Promise<void> => {
      await Promise.all(mounted.map(callback => callback()))
    },
    unmount: (): void => unmounted.forEach(callback => callback()),
  }
}

/**
 * Stubs `useLocalePath` like @nuxtjs/i18n with the `prefix_except_default` strategy.
 * @param locale - Current locale
 */
export const stubLocalePath = (locale: LocaleKey): void => {
  vi.stubGlobal(
    'useLocalePath',
    () =>
      (path: string): string =>
        locale === 'fr' ? path : `/${locale}${path}`,
  )
}
