<template>
  <div>
    <ProfessionalsHero />
    <ProfessionalsAudiences />
    <ServicesSection />
    <ProfessionalsProcess />
    <ProFormSection default-subject="quote" />
    <div class="bg-paper-2 py-8">
      <p
        class="mx-auto flex max-w-[1180px] flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 text-center text-sm font-semibold text-ink sm:px-8"
      >
        {{ $t('professionals.individuals.text') }}
        <NuxtLink
          :to="localePath('/booking')"
          class="font-black underline underline-offset-4 hover:text-primary"
        >
          {{ $t('professionals.individuals.cta') }}
        </NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const { t } = useI18n()
const localePath = useLocalePath()

useSeoMeta({
  title: () => t('professionals.seo.title'),
  description: () => t('professionals.seo.description'),
  ogTitle: () => t('professionals.seo.title'),
  ogDescription: () => t('professionals.seo.description'),
  ogType: 'website',
  twitterCard: 'summary_large_image',
})
</script>
