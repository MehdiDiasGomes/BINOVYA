<template>
  <div>
    <HeroSection />
    <HowItWorksSection />
    <ServicesSection />
    <OffersSection />
    <QuoteCtaSection />
    <FaqSection />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

usePageSeo('seo.home.title', 'seo.home.description')
</script>
