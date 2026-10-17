<template>
  <div class="flex min-h-dvh flex-col bg-paper">
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {{ $t('common.skipToContent') }}
    </a>
    <header
      class="relative z-40 border-b border-white/5 bg-navy-950 text-white"
      @keydown.esc="closeOnEscape"
    >
      <div
        class="mx-auto flex max-w-[1180px] items-center justify-between gap-x-6 px-4 py-3 sm:px-8"
      >
        <p class="font-heading text-lg font-black uppercase tracking-[3px]">
          {{ $t('pro.nav.brand') }}
        </p>
        <div v-if="isAdmin" class="hidden items-center gap-4 sm:flex">
          <nav :aria-label="$t('pro.nav.label')">
            <ul class="flex items-center gap-1">
              <li v-for="item in PRO_NAV_ITEMS" :key="item.path">
                <NuxtLink
                  :to="localePath(item.path)"
                  class="flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-white/80 transition-colors duration-press ease-brand hover:text-turquoise focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60 aria-[current=page]:text-white aria-[current=page]:underline aria-[current=page]:underline-offset-8 motion-reduce:transition-none"
                >
                  {{ $t(item.labelKey) }}
                </NuxtLink>
              </li>
            </ul>
          </nav>
          <button
            type="button"
            :aria-disabled="isSigningOut"
            :class="PRO_SIGN_OUT_BUTTON_CLASS"
            @click="signOut"
          >
            <Icon name="LogOut" :size="16" aria-hidden="true" />
            {{ signOutLabel }}
          </button>
        </div>
        <MenuToggleButton
          v-if="isAdmin"
          ref="buttonRef"
          :is-open="isOpen"
          :controls="MOBILE_MENU_ID"
          class="size-11 rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60 sm:hidden"
          @toggle="toggle"
        />
      </div>

      <Transition v-bind="MOBILE_MENU_TRANSITION">
        <div
          v-if="isAdmin"
          v-show="isOpen"
          :id="MOBILE_MENU_ID"
          :class="cn(MOBILE_MENU_PANEL_CLASS, 'px-4 sm:hidden')"
        >
          <nav :aria-label="$t('pro.nav.label')">
            <ul class="flex flex-col">
              <li v-for="item in PRO_NAV_ITEMS" :key="item.path">
                <NuxtLink
                  :to="localePath(item.path)"
                  :class="MOBILE_MENU_LINK_CLASS"
                  @click="closeFromLink(localePath(item.path))"
                >
                  {{ $t(item.labelKey) }}
                </NuxtLink>
              </li>
            </ul>
          </nav>
          <button
            type="button"
            :aria-disabled="isSigningOut"
            :class="cn(PRO_SIGN_OUT_BUTTON_CLASS, 'mt-4 justify-center px-5 py-3')"
            @click="signOut"
          >
            <Icon name="LogOut" :size="16" aria-hidden="true" />
            {{ signOutLabel }}
          </button>
        </div>
      </Transition>
    </header>
    <main id="main-content" class="flex-1">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  MOBILE_MENU_LINK_CLASS,
  MOBILE_MENU_PANEL_CLASS,
  MOBILE_MENU_TRANSITION,
} from '@/constants/navbar'
import { PRO_NAV_ITEMS, PRO_SIGN_OUT_BUTTON_CLASS } from '@/constants/pro'
import { cn } from '@/lib/utils'

const MOBILE_MENU_ID: string = 'pro-mobile-menu'

const { t } = useI18n()
const localePath = useLocalePath()
const { isAdmin, leave } = useAdminSession()

const isSigningOut: Ref<boolean> = ref(false)
const { isOpen, buttonRef, toggle, closeOnEscape, closeFromLink } = useMobileMenu()

const signOutLabel: ComputedRef<string> = computed(() =>
  isSigningOut.value ? t('pro.nav.signingOut') : t('pro.nav.signOut'),
)

const signOut = async (): Promise<void> => {
  if (isSigningOut.value) {
    return
  }
  isSigningOut.value = true
  try {
    await leave()
  } finally {
    isSigningOut.value = false
  }
}
</script>
