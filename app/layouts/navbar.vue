<template>
  <header class="sticky top-0 z-50 w-full border-b border-white/5 bg-navy-950">
    <div class="mx-auto flex max-w-[1180px] items-center justify-between px-8 py-4">
      <!-- Logo -->
      <NuxtLink to="/" :aria-label="$t('common.backToHome')">
        <NuxtImg
          src="/images/brand/logo.png"
          :alt="$t('common.logoAlt')"
          class="h-10 w-auto object-contain"
          width="160"
          loading="eager"
        />
      </NuxtLink>

      <!-- Nav desktop -->
      <nav class="hidden items-center gap-8 md:flex" :aria-label="$t('nav.mainNavAriaLabel')">
        <NuxtLink
          v-for="item in navigationItems"
          :key="item.labelKey"
          :to="{ path: localePath(item.path), hash: item.hash }"
          class="text-[14px] font-semibold text-[#dce8f0] transition-colors hover:text-turquoise"
        >
          {{ $t(item.labelKey) }}
        </NuxtLink>
      </nav>

      <!-- CTA + burger -->
      <div class="flex items-center gap-3.5">
        <NuxtLink
          :to="localePath('/booking')"
          class="hidden items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-px hover:bg-primary/90 md:flex"
          :aria-label="$t('nav.reserverAriaLabel')"
        >
          <Icon name="CalendarCheck" :size="16" aria-hidden="true" />
          {{ $t('nav.reserver') }}
        </NuxtLink>
        <button
          type="button"
          class="flex h-9 w-9 flex-col items-center justify-center gap-1.5 md:hidden"
          :aria-label="mobileMenuOpen ? $t('nav.closeMenu') : $t('nav.openMenu')"
          :aria-expanded="mobileMenuOpen"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <span :class="['block h-0.5 w-5 bg-white transition-all duration-300', mobileMenuOpen && 'translate-y-2 rotate-45']" />
          <span :class="['block h-0.5 w-5 bg-white transition-all duration-300', mobileMenuOpen && 'opacity-0']" />
          <span :class="['block h-0.5 w-5 bg-white transition-all duration-300', mobileMenuOpen && '-translate-y-2 -rotate-45']" />
        </button>
      </div>
    </div>

    <!-- Mobile menu -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out overflow-hidden"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-96 opacity-100"
      leave-active-class="transition-all duration-200 ease-in overflow-hidden"
      leave-from-class="max-h-96 opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
    <div
      v-if="mobileMenuOpen"
      class="flex flex-col border-t border-white/8 bg-navy-900 px-8 pb-5 pt-2.5 md:hidden"
    >
      <a
        v-for="item in navigationItems"
        :key="item.labelKey"
        :href="localePath(item.path) + (item.hash ?? '')"
        class="border-b border-white/5 py-3 text-[15px] font-semibold text-[#dce8f0] transition-colors hover:text-turquoise"
        @click.prevent="handleMobileNavClick(item)"
      >
        {{ $t(item.labelKey) }}
      </a>
      <NuxtLink
        :to="localePath('/booking')"
        class="mt-4 flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white"
        @click="mobileMenuOpen = false"
      >
        <Icon name="CalendarCheck" :size="16" aria-hidden="true" />
        {{ $t('nav.reserverAriaLabel') }}
      </NuxtLink>
    </div>
    </Transition>
  </header>
</template>

<script setup lang="ts">
import { navigationItems, type NavItem } from '@/constants/navbar'

const localePath = useLocalePath()
const mobileMenuOpen = ref<boolean>(false)

const handleMobileNavClick = async (item: NavItem): Promise<void> => {
  mobileMenuOpen.value = false
  await navigateTo({ path: localePath(item.path), hash: item.hash })
}
</script>
