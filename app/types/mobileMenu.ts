import type MenuToggleButton from '@/components/MenuToggleButton.vue'

export type MenuToggleButtonInstance = InstanceType<typeof MenuToggleButton>

export type MobileMenuState = {
  isOpen: Ref<boolean>
  buttonRef: Ref<MenuToggleButtonInstance | null>
  toggle: () => void
  close: () => void
  closeOnEscape: () => Promise<void>
  closeFromLink: (path: string) => Promise<void>
  focusTarget: (targetId?: string) => Promise<void>
}
