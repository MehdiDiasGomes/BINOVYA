<template>
  <div class="min-h-[70vh] bg-paper">
    <div class="mx-auto max-w-[640px] px-4 pb-16 pt-12 sm:px-8 sm:pt-16">
      <section
        :class="HERO_ENTER_CLASS"
        aria-labelledby="payment-link-title"
        class="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8"
      >
        <span
          aria-hidden="true"
          class="mb-5 flex size-14 items-center justify-center rounded-full bg-paper-2 text-primary"
        >
          <Icon name="LinkIcon" :size="28" :stroke-width="2.25" />
        </span>
        <span class="mb-2.5 block text-[12.5px] font-black uppercase tracking-[1.5px] text-primary">
          {{ $t('booking.paymentLink.eyebrow') }}
        </span>
        <h1
          id="payment-link-title"
          class="text-[28px] font-black leading-tight text-ink sm:text-[32px]"
        >
          {{ $t('booking.paymentLink.title') }}
        </h1>
        <p class="mt-3 text-[15px] leading-relaxed text-ink/80">
          {{ $t('booking.paymentLink.text') }}
        </p>
        <p class="mt-3 text-[15px] leading-relaxed text-ink/80">
          {{ $t('booking.paymentLink.reopen') }}
        </p>
        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <AppButton :to="localePath('/contact')" icon="Mail">
            {{ $t('booking.paymentLink.contact') }}
          </AppButton>
          <AppButton :to="localePath('/')" variant="secondary">
            {{ $t('booking.paymentLink.home') }}
          </AppButton>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { HERO_ENTER_CLASS } from '@/constants/motion'

const { t } = useI18n()
const localePath = useLocalePath()

useSeoMeta({
  title: () => t('booking.paymentLink.seo.title'),
  robots: 'noindex, nofollow',
})
</script>
