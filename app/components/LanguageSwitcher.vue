<template>
  <nav :aria-label="$t('common.language')">
    <ul
      role="list"
      :class="cn('flex items-center', variant === 'mobile' ? '-ml-3 gap-1 py-1' : 'gap-0.5')"
    >
      <li
        v-for="link in languageLinks"
        :key="link.code"
        :class="
          cn(
            variant === 'desktop' &&
              'relative not-first:before:absolute not-first:before:-left-px not-first:before:top-1/2 not-first:before:h-4 not-first:before:w-px not-first:before:-translate-y-1/2 not-first:before:bg-white/30',
          )
        "
      >
        <NuxtLink
          :to="link.path"
          :lang="link.language"
          :hreflang="link.language"
          :aria-current="link.isCurrent ? 'true' : undefined"
          :class="
            cn(LANGUAGE_LINK_CLASS, variant === 'mobile' ? 'px-3 text-[15px]' : 'px-2 text-[14px]')
          "
          @click="emit('navigate', link.path)"
        >
          <span
            v-if="variant === 'desktop'"
            class="uppercase lg:sr-only"
            :aria-hidden="link.isCodeInName ? 'true' : undefined"
            >{{ link.code }}</span
          >
          <span :class="cn(variant === 'desktop' && 'sr-only lg:not-sr-only')">{{
            link.name
          }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import type { LanguageLink, LanguageSwitcherVariant } from '@/types/i18n'
import type { LocaleObject } from '@nuxtjs/i18n'

import { LANGUAGE_LINK_CLASS } from '@/constants/navbar'
import { cn } from '@/lib/utils'

withDefaults(defineProps<{ variant?: LanguageSwitcherVariant }>(), {
  variant: 'desktop',
})

const emit = defineEmits<{ navigate: [path: string] }>()

const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const localePath = useLocalePath()

const languageLinks: ComputedRef<LanguageLink[]> = computed(() =>
  locales.value.map((item: LocaleObject): LanguageLink => {
    const name: string = item.name ?? item.code
    const language: string = item.language ?? item.code
    return {
      code: item.code,
      name,
      language,
      path: switchLocalePath(item.code) || localePath('/', item.code),
      isCurrent: item.code === locale.value,
      isCodeInName: name
        .toLocaleLowerCase(language)
        .includes(item.code.toLocaleLowerCase(language)),
    }
  }),
)
</script>
