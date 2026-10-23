<template>
  <section aria-labelledby="home-hero-title" class="bg-navy-950">
    <div
      :class="
        cn(
          HOME_SECTION_CONTAINER_CLASS,
          'grid grid-cols-1 items-center gap-12 py-20 lg:grid-cols-[1fr_1.1fr] lg:py-24',
        )
      "
    >
      <div class="min-w-0">
        <p
          :class="HERO_ENTER_CLASS"
          class="mb-5 text-xs font-bold uppercase tracking-[2px] text-turquoise"
        >
          {{ $t('home.hero.eyebrow') }}
        </p>
        <h1
          id="home-hero-title"
          :class="HERO_ENTER_CLASS"
          class="delay-75 mb-5 text-balance text-[40px] font-black leading-[1.05] text-white sm:text-5xl"
        >
          {{ $t('home.hero.titleMain') }}
          <span class="text-turquoise">{{ $t('home.hero.titleAccent') }}</span>
        </h1>
        <p
          :class="HERO_ENTER_CLASS"
          class="delay-150 mb-9 max-w-lg text-lg leading-relaxed text-on-navy"
        >
          {{ $t('home.hero.lead') }}
        </p>
        <div
          :class="HERO_ENTER_CLASS"
          class="delay-200 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-7"
        >
          <AppButton
            :to="localePath('/booking')"
            variant="onDarkAccent"
            trailing-icon="ArrowRight"
            class="shrink-0 whitespace-nowrap rounded-xl px-7 py-4 font-heading text-base font-extrabold"
          >
            {{ $t('home.hero.cta') }}
          </AppButton>
          <NuxtLink
            :to="localePath('/quote')"
            class="inline-flex min-h-11 items-center justify-center rounded-sm text-center text-sm font-bold text-white underline decoration-turquoise decoration-2 underline-offset-[6px] transition-colors duration-press ease-brand hover:decoration-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60 motion-reduce:transition-none sm:justify-start sm:text-left"
          >
            {{ $t('home.hero.quoteLink') }}
          </NuxtLink>
        </div>
        <ul
          role="list"
          :class="HERO_ENTER_CLASS"
          class="delay-300 mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/15 pt-6 text-sm font-semibold text-on-navy"
        >
          <li v-for="key in HOME_HIGHLIGHT_KEYS" :key="key" class="flex items-center gap-2">
            <Icon name="Check" :size="16" aria-hidden="true" class="shrink-0 text-turquoise" />
            {{ $t(`home.hero.highlights.${key}`) }}
          </li>
        </ul>
      </div>

      <figure class="min-w-0">
        <BeforeAfterSlider
          :before="{ src: HOME_BEFORE_IMAGE_SRC, alt: $t('home.hero.beforeAlt') }"
          :after="{ src: HOME_AFTER_IMAGE_SRC, alt: $t('home.hero.afterAlt') }"
          :width="HOME_BEFORE_AFTER_WIDTH"
          :height="HOME_BEFORE_AFTER_HEIGHT"
          is-priority
        />
        <figcaption class="mt-3 text-center text-sm text-muted-foreground">
          {{ $t('home.hero.caption') }}
        </figcaption>
      </figure>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  HOME_AFTER_IMAGE_SRC,
  HOME_BEFORE_AFTER_HEIGHT,
  HOME_BEFORE_AFTER_WIDTH,
  HOME_BEFORE_IMAGE_SRC,
  HOME_HIGHLIGHT_KEYS,
  HOME_SECTION_CONTAINER_CLASS,
} from '@/constants/home'
import { HERO_ENTER_CLASS } from '@/constants/motion'
import { cn } from '@/lib/utils'

const localePath = useLocalePath()
</script>
