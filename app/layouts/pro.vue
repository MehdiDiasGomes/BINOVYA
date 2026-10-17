<template>
  <div class="min-h-dvh bg-paper">
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {{ $t('common.skipToContent') }}
    </a>
    <header
      v-if="isAdmin"
      ref="sidebar"
      class="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col gap-8 overflow-y-auto border-r border-white/10 bg-navy-950 px-4 py-6 text-white lg:flex"
    >
      <NuxtLink
        :to="localePath(PRO_HOME_PATH)"
        :class="BRAND_LINK_CLASS"
        class="flex min-h-11 items-center px-3"
      >
        {{ $t('pro.nav.brand') }}
      </NuxtLink>
      <ProNavPanel />
    </header>
    <header
      :class="
        cn('relative z-30 border-b border-white/5 bg-navy-950 text-white', isAdmin && 'lg:hidden')
      "
    >
      <div class="flex items-center justify-between gap-x-6 px-4 py-3 sm:px-8">
        <NuxtLink
          v-if="isAdmin"
          :to="localePath(PRO_HOME_PATH)"
          :class="BRAND_LINK_CLASS"
          class="flex min-h-11 items-center"
        >
          {{ $t('pro.nav.brand') }}
        </NuxtLink>
        <p v-else :class="BRAND_TEXT_CLASS">
          {{ $t('pro.nav.brand') }}
        </p>
        <DialogRoot v-if="isAdmin" v-model:open="isMenuOpen">
          <MenuToggleButton
            ref="menuButton"
            :is-open="isMenuOpen"
            :controls="PRO_NAV_SHEET_ID"
            :class="MENU_ICON_BUTTON_CLASS"
            @toggle="toggle"
          />
          <DialogPortal>
            <DialogOverlay :class="PRO_DIALOG_OVERLAY_CLASS" />
            <DialogContent
              :id="PRO_NAV_SHEET_ID"
              :aria-describedby="undefined"
              class="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto border-r border-white/10 bg-navy-950 px-4 py-4 text-white shadow-xl ease-brand focus:outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=closed]:duration-press data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=open]:duration-lift motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none"
              @close-auto-focus="returnFocus"
            >
              <div class="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <DialogTitle :class="BRAND_TEXT_CLASS">
                  {{ $t('pro.nav.brand') }}
                </DialogTitle>
                <DialogClose
                  :aria-label="$t('pro.nav.closeMenu')"
                  :class="cn(MENU_ICON_BUTTON_CLASS, 'flex items-center justify-center')"
                >
                  <Icon name="X" :size="20" aria-hidden="true" />
                </DialogClose>
              </div>
              <ProNavPanel @navigate="closeMenu" />
            </DialogContent>
          </DialogPortal>
        </DialogRoot>
      </div>
    </header>
    <main id="main-content" tabindex="-1" :class="cn('focus:outline-none', isAdmin && 'lg:pl-64')">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'

import type { MobileMenuState } from '@/types/mobileMenu'

import {
  PRO_DIALOG_OVERLAY_CLASS,
  PRO_HOME_PATH,
  PRO_NAV_SHEET_ID,
  PRO_SIDEBAR_QUERY,
} from '@/constants/pro'
import { cn } from '@/lib/utils'

const BRAND_TEXT_CLASS: string = 'font-heading text-lg font-black uppercase tracking-[3px]'

const BRAND_LINK_CLASS: string = cn(
  BRAND_TEXT_CLASS,
  'rounded-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60',
)

const MENU_ICON_BUTTON_CLASS: string =
  'size-11 rounded-lg transition-colors duration-press ease-brand hover:bg-white/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60 motion-reduce:transition-none'

const localePath = useLocalePath()
const { isAdmin } = useAdminSession()
const {
  isOpen: isMenuOpen,
  buttonRef: menuButton,
  toggle,
  close: closeMenu,
}: MobileMenuState = useMobileMenu()

const sidebar: Ref<HTMLElement | null> = ref(null)
const isSidebarShown: Readonly<Ref<boolean>> = useMediaQuery(PRO_SIDEBAR_QUERY)

const returnFocus = (event: Event): void => {
  event.preventDefault()
  if (isSidebarShown.value) {
    sidebar.value?.querySelector<HTMLAnchorElement>('a')?.focus()
    return
  }
  menuButton.value?.button?.focus()
}

watch(isSidebarShown, (isShown: boolean): void => {
  if (isShown) {
    closeMenu()
  }
})
</script>
