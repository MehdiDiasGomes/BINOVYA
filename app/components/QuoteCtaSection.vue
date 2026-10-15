<template>
  <section
    aria-labelledby="quote-cta-title"
    class="bg-gradient-to-b from-navy-950 to-[#020810] py-16 sm:py-24"
  >
    <div class="mx-auto max-w-[1180px] px-4 text-center sm:px-8">
      <Reveal>
        <span class="mb-3 block text-[12.5px] font-black uppercase tracking-[1.5px] text-turquoise">
          {{ $t('quoteCta.eyebrow') }}
        </span>
      </Reveal>
      <Reveal :delay="REVEAL_STAGGER">
        <h2
          id="quote-cta-title"
          class="mx-auto max-w-[720px] text-[32px] font-black leading-tight text-white sm:text-4xl"
        >
          {{ $t('quoteCta.title') }}
        </h2>
      </Reveal>
      <Reveal :delay="REVEAL_STAGGER * 2">
        <p class="mx-auto mt-4 max-w-[560px] text-[16.5px] leading-relaxed text-[#c4d6e2]">
          {{ $t('quoteCta.subtitle') }}
        </p>
      </Reveal>
      <Reveal
        :delay="REVEAL_STAGGER * 3"
        class="mx-auto mt-10 flex max-w-[420px] flex-col gap-3.5 sm:max-w-none sm:flex-row sm:justify-center"
      >
        <NuxtLink
          :to="localePath('/quote')"
          class="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-bold text-white shadow-lg shadow-primary/35 transition-all hover:-translate-y-px hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60"
        >
          <Icon name="FileText" :size="16" aria-hidden="true" />
          {{ $t('quoteCta.quote') }}
        </NuxtLink>
        <NuxtLink
          :to="localePath('/contact')"
          class="flex h-12 items-center justify-center gap-2 rounded-lg border border-white/25 px-6 text-sm font-bold text-white transition-all hover:border-turquoise hover:bg-turquoise/8 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60"
        >
          <Icon name="Mail" :size="16" aria-hidden="true" />
          {{ $t('quoteCta.contact') }}
        </NuxtLink>
      </Reveal>
    </div>
  </section>
</template>

<script setup lang="ts">
import { REVEAL_STAGGER } from '@/constants/motion'

const localePath = useLocalePath()
</script>
