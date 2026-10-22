<template>
  <section id="particuliers" class="bg-paper-2 py-20">
    <div class="mx-auto max-w-[1180px] px-8">
      <Reveal class="mb-12 text-center">
        <span class="mb-2.5 block text-[12.5px] font-black uppercase tracking-[1.5px] text-primary">
          {{ $t('offers.eyebrow') }}
        </span>
        <h2 class="text-[32px] font-black text-ink">{{ $t('offers.title') }}</h2>
        <p class="mx-auto mt-3 max-w-[560px] text-[15px] leading-relaxed text-ink/70">
          {{ $t('offers.subtitle') }}
        </p>
      </Reveal>

      <div class="grid gap-6 md:grid-cols-2">
        <Reveal class="flex flex-col rounded-2xl border border-[#e6eef2] bg-white p-8 shadow-sm">
          <div class="mb-6 flex justify-center">
            <NuxtImg
              src="/images/offers/petit-format.png"
              alt=""
              class="h-40 w-auto object-contain"
              width="107"
              height="160"
              sizes="107px"
              format="webp"
              loading="lazy"
            />
          </div>
          <h3 class="mb-2 text-xl font-black text-ink">{{ $t('offers.small.title') }}</h3>
          <p class="mb-4 flex-1 text-sm leading-relaxed text-ink/70">
            {{ $t('offers.small.desc') }}
          </p>
          <div class="mb-1 text-[22px] font-black text-ink">{{ $t('offers.small.price') }}</div>
          <div class="mb-6 text-sm text-ink/70">{{ $t('offers.small.priceNote') }}</div>
          <NuxtLink
            :to="{ path: localePath('/booking'), query: { service: 'small-bin' } }"
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/30 transition-[translate,background-color,box-shadow] duration-press ease-brand hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 [@media(hover:hover)]:hover:-translate-y-px"
            :aria-label="$t('offers.small.ctaAriaLabel')"
          >
            <Icon name="CalendarCheck" :size="16" aria-hidden="true" />
            {{ $t('offers.cta') }}
          </NuxtLink>
        </Reveal>

        <Reveal
          class="relative flex flex-col rounded-2xl border-2 border-turquoise bg-white p-8 shadow-sm"
          :delay="REVEAL_STAGGER"
        >
          <div
            class="absolute -top-3 left-6 rounded-full bg-accent px-3 py-0.5 text-xs font-black text-accent-foreground"
          >
            {{ $t('offers.large.badge') }}
          </div>
          <div class="mb-6 flex justify-center">
            <NuxtImg
              src="/images/offers/grand-format.png"
              alt=""
              class="h-40 w-auto object-contain"
              width="202"
              height="160"
              sizes="202px"
              format="webp"
              loading="lazy"
            />
          </div>
          <h3 class="mb-2 text-xl font-black text-ink">{{ $t('offers.large.title') }}</h3>
          <p class="mb-4 flex-1 text-sm leading-relaxed text-ink/70">
            {{ $t('offers.large.desc') }}
          </p>
          <div class="mb-1 text-[22px] font-black text-ink">{{ $t('offers.large.price') }}</div>
          <div class="mb-6 text-sm text-ink/70">{{ $t('offers.large.priceNote') }}</div>
          <NuxtLink
            :to="{ path: localePath('/booking'), query: { service: 'large-bin' } }"
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-3 text-sm font-bold text-accent-foreground shadow-md shadow-accent/30 transition-[translate,background-color,box-shadow] duration-press ease-brand hover:bg-accent/85 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 [@media(hover:hover)]:hover:-translate-y-px"
            :aria-label="$t('offers.large.ctaAriaLabel')"
          >
            <Icon name="CalendarCheck" :size="16" aria-hidden="true" />
            {{ $t('offers.cta') }}
          </NuxtLink>
        </Reveal>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { REVEAL_STAGGER } from '@/constants/motion'

const localePath = useLocalePath()
</script>
