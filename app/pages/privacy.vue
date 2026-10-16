<template>
  <div class="page-padding-x min-h-screen bg-background py-16 md:py-24">
    <div ref="elementRef" :class="['mx-auto max-w-4xl scroll-animate', isVisible && 'is-visible']">
      <div class="space-y-12">
        <div class="space-y-4 text-center">
          <h1 class="font-heading text-3xl text-foreground sm:text-4xl md:text-5xl">
            {{ $t('privacy.title') }}
          </h1>
          <p class="text-sm text-ink/80">{{ $t('privacy.lastUpdate') }} {{ lastUpdateDate }}</p>
        </div>

        <div class="space-y-8">
          <section class="space-y-4">
            <h2 class="font-heading text-2xl font-bold text-foreground">
              {{ $t('privacy.introduction.title') }}
            </h2>
            <p class="text-ink/80">
              {{ $t('privacy.introduction.content') }}
            </p>
          </section>

          <section class="space-y-4">
            <h2 class="font-heading text-2xl font-bold text-foreground">
              {{ $t('privacy.dataCollected.title') }}
            </h2>
            <p class="text-ink/80">
              {{ $t('privacy.dataCollected.intro') }}
            </p>
            <ul class="list-disc space-y-2 pl-6 text-ink/80">
              <li v-for="(item, index) in $tm('privacy.dataCollected.items')" :key="index">
                {{ item }}
              </li>
            </ul>
          </section>

          <section class="space-y-4">
            <h2 class="font-heading text-2xl font-bold text-foreground">
              {{ $t('privacy.dataUsage.title') }}
            </h2>
            <p class="text-ink/80">
              {{ $t('privacy.dataUsage.intro') }}
            </p>
            <ul class="list-disc space-y-2 pl-6 text-ink/80">
              <li v-for="(item, index) in $tm('privacy.dataUsage.items')" :key="index">
                {{ item }}
              </li>
            </ul>
          </section>

          <section class="space-y-4">
            <h2 class="font-heading text-2xl font-bold text-foreground">
              {{ $t('privacy.dataRetention.title') }}
            </h2>
            <p class="text-ink/80">
              {{ $t('privacy.dataRetention.content') }}
            </p>
          </section>

          <section class="space-y-4">
            <h2 class="font-heading text-2xl font-bold text-foreground">
              {{ $t('privacy.customerArea.title') }}
            </h2>
            <p class="text-ink/80">
              {{ $t('privacy.customerArea.legalBasis') }}
            </p>
            <p class="text-ink/80">
              {{ $t('privacy.customerArea.access', { hours: LOGIN_LINK_LIFETIME_HOURS }) }}
            </p>
            <p class="text-ink/80">
              {{ $t('privacy.customerArea.deletion') }}
            </p>
          </section>

          <section class="space-y-4">
            <h2 class="font-heading text-2xl font-bold text-foreground">
              {{ $t('privacy.rights.title') }}
            </h2>
            <p class="text-ink/80">
              {{ $t('privacy.rights.intro') }}
            </p>
            <p class="text-ink/80">
              {{ $t('privacy.rights.contact') }}
            </p>
          </section>

          <section class="space-y-4">
            <h2 class="font-heading text-2xl font-bold text-foreground">
              {{ $t('privacy.cookies.title') }}
            </h2>
            <p class="text-ink/80">
              {{ $t('privacy.cookies.content') }}
            </p>
          </section>

          <section class="space-y-4">
            <h2 class="font-heading text-2xl font-bold text-foreground">
              {{ $t('privacy.security.title') }}
            </h2>
            <p class="text-ink/80">
              {{ $t('privacy.security.content') }}
            </p>
          </section>

          <section class="space-y-4">
            <h2 class="font-heading text-2xl font-bold text-foreground">
              {{ $t('privacy.updates.title') }}
            </h2>
            <p class="text-ink/80">
              {{ $t('privacy.updates.content') }}
            </p>
          </section>

          <section class="space-y-4">
            <h2 class="font-heading text-2xl font-bold text-foreground">
              {{ $t('privacy.contact.title') }}
            </h2>
            <p class="text-ink/80">
              {{ $t('privacy.contact.content') }}
            </p>
            <div class="mt-4 rounded-lg bg-muted/50 p-6">
              <p class="font-medium text-foreground">BINOVYA</p>
              <p class="text-sm text-ink/80">
                {{ $t('contact.info.email.address') }}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LOGIN_LINK_LIFETIME_HOURS } from '@/constants/account'

const { t } = useI18n()
const { elementRef, isVisible } = useScrollAnimation(0.1)

const lastUpdateDate = computed((): string => '04/01/2025')

definePageMeta({
  layout: 'default',
})

useSeoMeta({
  title: () => t('seo.privacy.title'),
  description: () => t('seo.privacy.description'),
  ogTitle: () => t('seo.privacy.title'),
  ogDescription: () => t('seo.privacy.description'),
  ogType: 'website',
  twitterCard: 'summary_large_image',
})
</script>

<style scoped>
.scroll-animate {
  opacity: 0;
  transform: translateY(20px);
  transition: all 1s cubic-bezier(0.22, 1, 0.36, 1);
}

.scroll-animate.is-visible {
  opacity: 1;
  transform: translateY(0);
}
</style>
