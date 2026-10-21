<template>
  <header
    class="sticky top-0 z-50 w-full border-b border-white/5 bg-navy-950"
    @keydown.esc="closeOnEscape"
  >
    <div class="mx-auto flex max-w-[1180px] items-center justify-between px-8 py-4">
      <NuxtLink
        :to="localePath('/')"
        :aria-label="$t('common.backToHome')"
        class="rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60"
      >
        <NuxtImg
          src="/images/brand/logo.png"
          :alt="$t('common.logoAlt')"
          class="h-10 w-auto object-contain"
          width="48"
          height="40"
          loading="eager"
        />
      </NuxtLink>

      <nav class="hidden items-center gap-8 md:flex" :aria-label="$t('nav.mainNavAriaLabel')">
        <NuxtLink
          v-for="item in navigationItems"
          :key="item.labelKey"
          :to="{ path: localePath(item.path), hash: item.hash }"
          class="rounded-md text-[14px] font-semibold text-[#dce8f0] transition-colors duration-press ease-brand hover:text-turquoise focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60 motion-reduce:transition-none"
        >
          {{ $t(item.labelKey) }}
        </NuxtLink>
      </nav>

      <div class="flex items-center gap-3.5">
        <LanguageSwitcher class="hidden md:block" />
        <NuxtLink
          :to="accountPath"
          class="hidden h-11 items-center gap-2 rounded-lg px-2 text-[14px] font-semibold text-[#dce8f0] transition-colors duration-press ease-brand hover:text-turquoise focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60 motion-reduce:transition-none md:flex"
        >
          <Icon :name="accountIcon" :size="16" aria-hidden="true" />
          {{ $t(accountLabelKey) }}
        </NuxtLink>
        <NuxtLink
          :to="localePath('/booking')"
          class="hidden items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/30 transition-[translate,background-color] duration-press ease-brand hover:-translate-y-px hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60 motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:flex"
          :aria-label="$t('nav.reserverAriaLabel')"
        >
          <Icon name="CalendarCheck" :size="16" aria-hidden="true" />
          {{ $t('nav.reserver') }}
        </NuxtLink>
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
            @click.prevent="handleMobileNavClick(item)"
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
        <NuxtLink
          :to="localePath('/booking')"
          class="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white transition-colors duration-press ease-brand hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60 motion-reduce:transition-none"
          @click="closeFromLink(localePath('/booking'))"
        >
          <Icon name="CalendarCheck" :size="16" aria-hidden="true" />
          {{ $t('nav.reserverAriaLabel') }}
        </NuxtLink>
      </div>
    </Transition>
  </header>
</template>

<script setup lang="ts">
import type { AccountNavIcon } from '@/types/account'

import { ACCOUNT_NAV_ICONS, ACCOUNT_NAV_LABEL_KEYS, ACCOUNT_NAV_PATHS } from '@/constants/account'
import {
  MOBILE_MENU_LINK_CLASS,
  MOBILE_MENU_PANEL_CLASS,
  MOBILE_MENU_TRANSITION,
  navigationItems,
  type NavItem,
} from '@/constants/navbar'
import { cn } from '@/lib/utils'

const MOBILE_MENU_ID: string = 'site-mobile-menu'

const localePath = useLocalePath()
const route = useRoute()
const { isOpen, buttonRef, toggle, close, closeOnEscape, closeFromLink, focusTarget } =
  useMobileMenu()
const { status: sessionStatus } = useCustomerSession()

const accountPath: ComputedRef<string> = computed(() =>
  localePath(ACCOUNT_NAV_PATHS[sessionStatus.value]),
)

const accountLabelKey: ComputedRef<string> = computed(
  () => ACCOUNT_NAV_LABEL_KEYS[sessionStatus.value],
)

const accountIcon: ComputedRef<AccountNavIcon> = computed(
  () => ACCOUNT_NAV_ICONS[sessionStatus.value],
)

const handleMobileNavClick = async (item: NavItem): Promise<void> => {
  const path: string = localePath(item.path)
  const isCurrentPage: boolean = route.path === path
  close()
  await navigateTo({ path, hash: item.hash })
  if (isCurrentPage) {
    await focusTarget(item.focusId)
  }
}
</script>
