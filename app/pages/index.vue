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
definePageMeta({
  layout: 'default',
})

usePageSeo('seo.home.title', 'seo.home.description')
</script>
