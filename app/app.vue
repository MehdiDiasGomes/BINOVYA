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
import type { I18nHeadMetaInfo } from '@nuxtjs/i18n'
import type { ComputedRef, Ref } from 'vue'

import { Toaster } from '@/components/ui/sonner'

const route = useRoute()
const hasI18nBaseUrl: boolean = Boolean(useRuntimeConfig().public.i18n.baseUrl)

const localeHead: Ref<I18nHeadMetaInfo> = useLocaleHead({ seo: hasI18nBaseUrl })

const isPrivatePage: ComputedRef<boolean> = computed((): boolean => isPrivatePagePath(route.path))

useHead(() => ({
  htmlAttrs: localeHead.value.htmlAttrs,
  link: isPrivatePage.value ? [] : localeHead.value.link,
  meta: isPrivatePage.value ? [] : localeHead.value.meta,
}))
</script>
