<template>
  <div class="page-padding-x min-h-screen bg-background py-16 md:py-24">
    <div class="mx-auto max-w-4xl">
      <div class="space-y-12">
        <div :class="HERO_ENTER_CLASS" class="space-y-4 text-center">
          <h1 class="font-heading text-3xl text-foreground sm:text-4xl md:text-5xl">
            {{ $t('legal.title') }}
          </h1>
          <LegalLastUpdate :date="LEGAL_NOTICE_UPDATED_ON" class="text-sm text-ink/80" />
        </div>

        <div class="space-y-8">
          <section class="space-y-4">
            <h2 class="font-heading text-2xl font-bold text-foreground">
              {{ $t('legal.publisher.title') }}
            </h2>
            <div class="space-y-2 text-ink/80">
              <p>
                <strong class="text-foreground">{{ $t('legal.publisher.company') }}</strong>
                BINOVYA
              </p>
              <p>
                <strong class="text-foreground">{{ $t('legal.publisher.address') }}</strong>
                {{ $t('contact.info.address.line1') }}, {{ $t('contact.info.address.line2') }}
              </p>
              <p>
                <strong class="text-foreground">{{ $t('legal.publisher.email') }}</strong>
                {{ $t('contact.info.email.address') }}
              </p>
            </div>
          </section>

          <section class="space-y-4">
            <h2 class="font-heading text-2xl font-bold text-foreground">
              {{ $t('legal.hosting.title') }}
            </h2>
            <p class="text-ink/80">
              {{ $t('legal.hosting.content') }}
            </p>
          </section>

          <section class="space-y-4">
            <h2 class="font-heading text-2xl font-bold text-foreground">
              {{ $t('legal.intellectualProperty.title') }}
            </h2>
            <p class="text-ink/80">
              {{ $t('legal.intellectualProperty.content') }}
            </p>
          </section>

          <section class="space-y-4">
            <h2 class="font-heading text-2xl font-bold text-foreground">
              {{ $t('legal.personalData.title') }}
            </h2>
            <p class="text-ink/80">
              {{ $t('legal.personalData.content') }}
            </p>
          </section>

          <section class="space-y-4">
            <h2 class="font-heading text-2xl font-bold text-foreground">
              {{ $t('legal.cookies.title') }}
            </h2>
            <p class="text-ink/80">
              {{ $t('legal.cookies.content') }}
            </p>
          </section>

          <section class="space-y-4">
            <h2 class="font-heading text-2xl font-bold text-foreground">
              {{ $t('legal.liability.title') }}
            </h2>
            <p class="text-ink/80">
              {{ $t('legal.liability.content') }}
            </p>
          </section>

          <section class="space-y-4">
            <h2 class="font-heading text-2xl font-bold text-foreground">
              {{ $t('legal.applicableLaw.title') }}
            </h2>
            <p class="text-ink/80">
              {{ $t('legal.applicableLaw.content') }}
            </p>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LEGAL_NOTICE_UPDATED_ON } from '@/constants/legal'
import { HERO_ENTER_CLASS } from '@/constants/motion'

definePageMeta({
  layout: 'default',
})

usePageSeo('seo.legal.title', 'seo.legal.description')
</script>
