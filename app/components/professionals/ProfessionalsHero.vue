<template>
  <section class="bg-gradient-to-b from-[#020810] via-navy-950 to-navy-900 py-20">
    <div class="mx-auto max-w-[1180px] px-4 sm:px-8">
      <div class="max-w-[720px]">
        <span
          :class="HERO_ENTER_CLASS"
          class="mb-3.5 inline-block text-[13px] font-bold uppercase tracking-[1.5px] text-turquoise"
        >
          {{ $t('professionals.hero.eyebrow') }}
        </span>
        <h1
          :class="HERO_ENTER_CLASS"
          class="delay-75 mb-5 text-[38px] font-black leading-[1.12] text-white sm:text-5xl"
        >
          {{ $t('professionals.hero.titleMain') }}
          <span class="text-turquoise">{{ $t('professionals.hero.titleAccent') }}</span>
        </h1>
        <p
          :class="HERO_ENTER_CLASS"
          class="delay-150 mb-8 max-w-[600px] text-[16.5px] leading-relaxed text-[#c4d6e2]"
        >
          {{ $t('professionals.hero.lead') }}
        </p>

        <div :class="HERO_ENTER_CLASS" class="delay-200 flex flex-wrap gap-3.5">
          <a
            href="#contact"
            class="flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-white shadow-lg shadow-primary/35 transition-all hover:-translate-y-px hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60"
            :aria-label="$t('professionals.hero.ctaAriaLabel')"
          >
            <Icon name="FileText" :size="16" aria-hidden="true" />
            {{ $t('professionals.hero.cta') }}
          </a>
          <a
            href="#services"
            class="flex h-12 items-center gap-2 rounded-lg border border-white/25 px-5 text-sm font-bold text-white transition-all hover:border-turquoise hover:bg-turquoise/8 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60"
          >
            {{ $t('professionals.hero.secondary') }}
            <Icon name="ArrowDown" :size="16" aria-hidden="true" />
          </a>
        </div>
      </div>

      <ul
        :aria-label="$t('professionals.hero.highlightsLabel')"
        :class="HERO_ENTER_CLASS"
        class="delay-300 mt-12 grid gap-3.5 sm:grid-cols-3"
      >
        <li
          v-for="highlight in HIGHLIGHTS"
          :key="highlight.key"
          class="flex items-center gap-3 rounded-xl border border-turquoise/25 bg-white/4 px-4 py-3.5"
        >
          <Icon
            :name="highlight.icon"
            :size="22"
            aria-hidden="true"
            class="shrink-0 text-turquoise"
          />
          <span class="text-sm font-bold text-[#e7f2f7]">
            {{ $t(`professionals.hero.highlights.${highlight.key}`) }}
          </span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { LucideIconName } from '@/constants/clients'

import { HERO_ENTER_CLASS } from '@/constants/motion'

type Highlight = {
  key: string
  icon: LucideIconName
}

const HIGHLIGHTS: Highlight[] = [
  { key: 'response', icon: 'Clock' },
  { key: 'steam', icon: 'Thermometer' },
  { key: 'electric', icon: 'Zap' },
]
</script>
