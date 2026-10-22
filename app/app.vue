<template>
  <div>
    <NuxtRouteAnnouncer />
    <MotionConfig reduced-motion="user">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </MotionConfig>
    <Toaster position="top-right" rich-colors />
  </div>
</template>

<script setup lang="ts">
import type { BookingLocale } from '@/types/booking'
import type { I18nHeadMetaInfo, MetaAttrs } from '@nuxtjs/i18n'
import type { ReactiveHead } from '@unhead/vue'
import type { ComputedRef, Ref } from 'vue'

import { Toaster } from '@/components/ui/sonner'
import { OG_LOCALE_PROPERTIES, OG_LOCALES, OG_SITE_NAME } from '@/constants/seo'

const route = useRoute()
const { locale } = useI18n()
const hasI18nBaseUrl: boolean = Boolean(useRuntimeConfig().public.i18n.baseUrl)

const localeHead: Ref<I18nHeadMetaInfo> = useLocaleHead({ seo: hasI18nBaseUrl })

const isPrivatePage: ComputedRef<boolean> = computed((): boolean => isPrivatePagePath(route.path))

const ogLocaleMeta: ComputedRef<MetaAttrs[]> = computed((): MetaAttrs[] => {
  const current: BookingLocale = locale.value
  const alternates: MetaAttrs[] = (Object.keys(OG_LOCALES) as BookingLocale[])
    .filter((code: BookingLocale): boolean => code !== current)
    .map(
      (code: BookingLocale): MetaAttrs => ({
        property: 'og:locale:alternate',
        content: OG_LOCALES[code],
      }),
    )
  return [{ property: 'og:locale', content: OG_LOCALES[current] }, ...alternates]
})

const publicMeta: ComputedRef<MetaAttrs[]> = computed((): MetaAttrs[] => [
  ...localeHead.value.meta.filter(
    (meta: MetaAttrs): boolean => !OG_LOCALE_PROPERTIES.includes(meta.property ?? ''),
  ),
  ...ogLocaleMeta.value,
  { property: 'og:site_name', content: OG_SITE_NAME },
  { name: 'twitter:card', content: 'summary' },
])

useHead(
  (): ReactiveHead => ({
    htmlAttrs: localeHead.value.htmlAttrs,
    link: isPrivatePage.value ? [] : localeHead.value.link,
    meta: isPrivatePage.value ? [] : publicMeta.value,
  }),
)
</script>
