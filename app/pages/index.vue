<template>
  <div>
    <HeroSection />
    <TrustStripSection />
    <ServicesSection />
    <BeforeAfterSection />
    <OffersSection />
    <QuoteCtaSection />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

definePageMeta({
  layout: 'default',
})

useSeoMeta({
  title: () => t('seo.home.title'),
  description: () => t('seo.home.description'),
  ogTitle: () => t('seo.home.title'),
  ogDescription: () => t('seo.home.description'),
  ogType: 'website',
  twitterCard: 'summary_large_image',
})
</script>
