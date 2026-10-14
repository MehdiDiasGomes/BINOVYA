<template>
  <section id="accueil" class="overflow-hidden bg-gradient-to-b from-[#020810] via-navy-950 to-navy-900 py-20">
    <div class="mx-auto max-w-[1180px] px-8">
      <div class="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
        <!-- Texte -->
        <div>
          <span :class="HERO_ENTER_CLASS" class="mb-3.5 inline-block text-[13px] font-bold uppercase tracking-[1.5px] text-turquoise">
            {{ $t('hero.eyebrow') }}
          </span>
          <h1 :class="HERO_ENTER_CLASS" class="delay-75 mb-5 text-[44px] font-black leading-[1.12] text-white lg:text-5xl">
            {{ $t('hero.titleMain') }}
            <span class="text-turquoise">{{ $t('hero.titleAccent') }}</span>
          </h1>
          <p :class="HERO_ENTER_CLASS" class="delay-150 mb-8 max-w-[500px] text-[16.5px] leading-relaxed text-[#c4d6e2]">
            {{ $t('hero.lead') }}
          </p>

          <div :class="HERO_ENTER_CLASS" class="delay-200 mb-8 flex flex-wrap gap-3.5">
            <NuxtLink
              :to="localePath('/booking')"
              class="flex items-center gap-2 rounded-lg bg-primary px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/35 transition-all hover:-translate-y-px hover:bg-primary/90"
              :aria-label="$t('hero.ctaReserverAriaLabel')"
            >
              <Icon name="CalendarCheck" :size="16" aria-hidden="true" />
              {{ $t('hero.ctaReserver') }}
            </NuxtLink>
            <NuxtLink
              :to="localePath('/professionals')"
              class="flex items-center gap-2 rounded-lg border border-white/25 px-5 py-3.5 text-sm font-bold text-white transition-all hover:border-turquoise hover:bg-turquoise/8"
              :aria-label="$t('hero.ctaDevisAriaLabel')"
            >
              <Icon name="FileText" :size="16" aria-hidden="true" />
              {{ $t('hero.ctaDevis') }}
            </NuxtLink>
          </div>

          <div :class="HERO_ENTER_CLASS" class="delay-300 mt-2 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            <div
              v-for="badge in heroBadges"
              :key="badge.key"
              class="flex flex-col items-center rounded-xl border border-turquoise/25 bg-white/4 px-2 py-3.5 text-center transition-all hover:-translate-y-1 hover:border-turquoise"
            >
              <Icon :name="badge.icon" class="mb-2 h-8 w-8 text-turquoise" aria-hidden="true" />
              <span class="text-[11px] font-bold leading-tight tracking-wide text-[#e7f2f7]">
                {{ $t(badge.labelKey) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Image -->
        <div class="animate-in fade-in zoom-in-95 fill-mode-both delay-150 duration-1000 motion-reduce:animate-none relative">
          <NuxtImg
            src="/images/hero.png"
            :alt="$t('hero.imageAlt')"
            class="block w-full rounded-[18px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]"
            width="600"
            loading="eager"
            fetchpriority="high"
          />
          <div
            class="animate-in fade-in zoom-in-75 fill-mode-both delay-700 duration-500 motion-reduce:animate-none absolute -bottom-4 -left-4 flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-navy-950 shadow-[0_10px_24px_rgba(0,0,0,0.25)]"
            aria-live="polite"
          >
            <span class="relative flex h-2 w-2">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full motion-reduce:animate-none bg-green-500 opacity-75" />
              <span class="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            {{ $t('hero.platNote') }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { HERO_ENTER_CLASS } from '@/constants/motion'

const localePath = useLocalePath()

type HeroBadge = {
  key: string
  icon: string
  labelKey: string
}

const heroBadges: HeroBadge[] = [
  { key: 'steam', icon: 'Thermometer', labelKey: 'hero.badges.steam' },
  { key: 'eco', icon: 'Leaf', labelKey: 'hero.badges.eco' },
  { key: 'electric', icon: 'Zap', labelKey: 'hero.badges.electric' },
  { key: 'natural', icon: 'Droplets', labelKey: 'hero.badges.natural' },
]
</script>
