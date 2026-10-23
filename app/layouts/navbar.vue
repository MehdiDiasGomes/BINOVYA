<template>
  <header
    class="sticky top-0 z-50 w-full border-b border-white/5 bg-navy-950"
    @keydown.esc="closeOnEscape"
  >
    <div
      class="mx-auto flex max-w-[1180px] items-center justify-between px-8 py-2.5 md:px-6 md:py-3.5 lg:px-8 lg:py-2.5"
    >
      <NuxtLink
        :to="localePath('/')"
        :aria-label="$t('common.backToHome')"
        class="rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60"
      >
        <BrandLogo tone="onDark" class="block h-13 w-auto md:h-8 lg:h-13" />
      </NuxtLink>

      <nav
        class="hidden items-center gap-5 md:flex lg:gap-8"
        :aria-label="$t('nav.mainNavAriaLabel')"
      >
        <NuxtLink
          v-for="item in navigationItems"
          :key="item.labelKey"
          :to="{ path: localePath(item.path), hash: item.hash }"
          class="rounded-md text-[14px] font-semibold text-on-navy transition-colors duration-press ease-brand hover:text-turquoise focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60 motion-reduce:transition-none"
        >
          {{ $t(item.labelKey) }}
        </NuxtLink>
      </nav>

      <div class="flex items-center gap-3.5">
        <LanguageSwitcher class="hidden md:block" />
        <NuxtLink
          :to="accountPath"
          class="hidden h-11 items-center gap-2 rounded-lg px-2 text-[14px] font-semibold text-on-navy transition-colors duration-press ease-brand hover:text-turquoise focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60 motion-reduce:transition-none md:flex"
        >
          <Icon :name="accountIcon" :size="16" aria-hidden="true" />
          {{ $t(accountLabelKey) }}
        </NuxtLink>
        <AppButton
          :to="localePath('/booking')"
          variant="onDarkPrimary"
          size="sm"
          icon="CalendarCheck"
          class="hidden px-5 md:inline-flex"
          :aria-label="$t('nav.reserverAriaLabel')"
        >
          {{ $t('nav.reserver') }}
        </AppButton>
        <MenuToggleButton
          ref="buttonRef"
          :is-open="isOpen"
          :controls="MOBILE_MENU_ID"
          class="size-11 rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60 md:hidden"
          @toggle="toggle"
        />
      </div>
    </div>

    <Transition v-bind="MOBILE_MENU_TRANSITION">
      <div
        v-show="isOpen"
        :id="MOBILE_MENU_ID"
        :class="cn(MOBILE_MENU_PANEL_CLASS, 'px-8 md:hidden')"
      >
        <nav :aria-label="$t('nav.mainNavAriaLabel')" class="flex flex-col">
          <a
            v-for="item in navigationItems"
            :key="item.labelKey"
            :href="localePath(item.path) + (item.hash ?? '')"
            :class="MOBILE_MENU_LINK_CLASS"
            @click="handleMobileNavClick($event, item)"
          >
            {{ $t(item.labelKey) }}
          </a>
        </nav>
        <NuxtLink
          :to="accountPath"
          :class="MOBILE_MENU_LINK_CLASS"
          @click="closeFromLink(accountPath)"
        >
          <Icon :name="accountIcon" :size="16" aria-hidden="true" />
          {{ $t(accountLabelKey) }}
        </NuxtLink>
        <LanguageSwitcher
          variant="mobile"
          class="border-b border-white/5"
          @navigate="closeFromLink"
        />
        <AppButton
          :to="localePath('/booking')"
          variant="onDarkPrimary"
          size="sm"
          icon="CalendarCheck"
          class="mt-4 px-5 py-3"
          @click="closeFromLink(localePath('/booking'))"
        >
          {{ $t('nav.reserverAriaLabel') }}
        </AppButton>
      </div>
    </Transition>
  </header>
</template>

<script setup lang="ts">
import type { AnchorNavigationOutcome, NavItem } from '@/types/navbar'

import {
  MOBILE_MENU_LINK_CLASS,
  MOBILE_MENU_PANEL_CLASS,
  MOBILE_MENU_TRANSITION,
  navigationItems,
} from '@/constants/navbar'
import { cn } from '@/lib/utils'

const MOBILE_MENU_ID: string = 'site-mobile-menu'

const localePath = useLocalePath()
const { isOpen, buttonRef, toggle, close, closeOnEscape, closeFromLink, focusTarget } =
  useMobileMenu()
const { path: accountPath, labelKey: accountLabelKey, icon: accountIcon } = useAccountNavLink()
const navigateToItem = useAnchorNavigation()

const handleMobileNavClick = async (event: MouseEvent, item: NavItem): Promise<void> => {
  const outcome: AnchorNavigationOutcome = await navigateToItem(event, item)
  if (outcome === 'ignored') {
    return
  }
  close()
  if (outcome === 'currentPage') {
    await focusTarget(item.focusId)
  }
}
</script>
