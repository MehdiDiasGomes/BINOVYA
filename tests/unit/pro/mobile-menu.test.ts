import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref, watch } from 'vue'

import { useMobileMenu } from '../../../app/composables/useMobileMenu'

import type { MobileMenuState } from '../../../app/types/mobileMenu'

const route = { fullPath: '/pro' }

const buttonFocus = vi.fn()

const targetFocus = vi.fn()

const targetScrollIntoView = vi.fn()

let hasTarget = false

const setup = (): MobileMenuState => {
  const menu = useMobileMenu()
  menu.buttonRef.value = { button: { focus: buttonFocus } } as never
  return menu
}

beforeEach(() => {
  route.fullPath = '/pro'
  hasTarget = false
  vi.stubGlobal('useRoute', () => route)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('watch', watch)
  vi.stubGlobal('nextTick', nextTick)
  vi.stubGlobal('document', {
    getElementById: (id: string) =>
      hasTarget && id === 'services-heading'
        ? { focus: targetFocus, scrollIntoView: targetScrollIntoView }
        : null,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  buttonFocus.mockReset()
  targetFocus.mockReset()
  targetScrollIntoView.mockReset()
})

describe('useMobileMenu', () => {
  it('starts closed and toggles', () => {
    const menu = setup()
    expect(menu.isOpen.value).toBe(false)
    menu.toggle()
    expect(menu.isOpen.value).toBe(true)
    menu.toggle()
    expect(menu.isOpen.value).toBe(false)
  })

  it('closes on Escape and gives the focus back to the toggle button', async () => {
    const menu = setup()
    menu.toggle()
    await menu.closeOnEscape()
    expect(menu.isOpen.value).toBe(false)
    expect(buttonFocus).toHaveBeenCalledTimes(1)
  })

  it('does nothing on Escape when the menu is closed, so the focus is not stolen', async () => {
    const menu = setup()
    await menu.closeOnEscape()
    expect(buttonFocus).not.toHaveBeenCalled()
  })

  it('closes on a link to another page without moving the focus', async () => {
    const menu = setup()
    menu.toggle()
    await menu.closeFromLink('/pro/interventions')
    expect(menu.isOpen.value).toBe(false)
    expect(buttonFocus).not.toHaveBeenCalled()
  })

  it('closes on a link to the current page and focuses the toggle button', async () => {
    const menu = setup()
    menu.toggle()
    await menu.closeFromLink('/pro')
    expect(menu.isOpen.value).toBe(false)
    expect(buttonFocus).toHaveBeenCalledTimes(1)
  })

  it('focuses the anchor target when it exists', async () => {
    hasTarget = true
    const menu = setup()
    await menu.focusTarget('services-heading')
    expect(targetFocus).toHaveBeenCalledTimes(1)
    expect(targetFocus).toHaveBeenCalledWith({ preventScroll: true })
    expect(targetScrollIntoView).toHaveBeenCalledTimes(1)
    expect(targetScrollIntoView).toHaveBeenCalledWith({ block: 'start' })
    expect(buttonFocus).not.toHaveBeenCalled()
  })

  it('falls back to the toggle button when the anchor target does not exist', async () => {
    const menu = setup()
    await menu.focusTarget('services-heading')
    expect(targetFocus).not.toHaveBeenCalled()
    expect(targetScrollIntoView).not.toHaveBeenCalled()
    expect(buttonFocus).toHaveBeenCalledTimes(1)
    expect(buttonFocus).toHaveBeenCalledWith()
  })

  it('falls back to the toggle button without target id', async () => {
    hasTarget = true
    const menu = setup()
    await menu.focusTarget()
    expect(buttonFocus).toHaveBeenCalledTimes(1)
  })

  it('does not fail when the toggle button is not mounted', async () => {
    const menu = useMobileMenu()
    await expect(menu.focusTarget()).resolves.toBeUndefined()
  })

  it('closes when the route changes', async () => {
    const reactiveRoute = (await import('vue')).reactive({ fullPath: '/pro' })
    vi.stubGlobal('useRoute', () => reactiveRoute)
    const menu = setup()
    menu.toggle()
    reactiveRoute.fullPath = '/pro/interventions'
    await nextTick()
    expect(menu.isOpen.value).toBe(false)
  })
})
