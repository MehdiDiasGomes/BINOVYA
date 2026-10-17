import type { MenuToggleButtonInstance, MobileMenuState } from '@/types/mobileMenu'

/**
 * Holds the open state of a layout's mobile menu. The menu closes on every route change; Escape
 * and a link to the current page close it and give the focus back to the toggle button, or to the
 * anchor target of an in-page link when it exists.
 * @returns Open state, toggle button ref and the closing actions
 */
export const useMobileMenu = (): MobileMenuState => {
  const route = useRoute()
  const isOpen: Ref<boolean> = ref(false)
  const buttonRef: Ref<MenuToggleButtonInstance | null> = ref(null)

  const toggle = (): void => {
    isOpen.value = !isOpen.value
  }

  const close = (): void => {
    isOpen.value = false
  }

  const focusTarget = async (targetId?: string): Promise<void> => {
    await nextTick()
    const target: HTMLElement | null = targetId ? document.getElementById(targetId) : null
    if (target) {
      target.focus({ preventScroll: true })
      target.scrollIntoView({ block: 'start' })
      return
    }
    buttonRef.value?.button?.focus()
  }

  const closeOnEscape = async (): Promise<void> => {
    if (!isOpen.value) {
      return
    }
    close()
    await focusTarget()
  }

  const closeFromLink = async (path: string): Promise<void> => {
    close()
    if (route.fullPath === path) {
      await focusTarget()
    }
  }

  watch(() => route.fullPath, close)

  return { isOpen, buttonRef, toggle, close, closeOnEscape, closeFromLink, focusTarget }
}
