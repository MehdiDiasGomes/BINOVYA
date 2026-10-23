<template>
  <section id="comment" aria-labelledby="home-steps-title" class="bg-white py-20">
    <div :class="HOME_SECTION_CONTAINER_CLASS">
      <Reveal class="mb-12 max-w-xl">
        <p :class="cn(HOME_EYEBROW_CLASS, 'text-primary')">{{ $t('home.steps.eyebrow') }}</p>
        <h2 id="home-steps-title" :class="cn(HOME_SECTION_TITLE_CLASS, 'text-ink')">
          {{ $t('home.steps.title') }}
        </h2>
      </Reveal>
      <ol role="list" class="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Reveal
          v-for="(key, index) in HOME_STEP_KEYS"
          :key="key"
          as="li"
          :delay="index * REVEAL_STAGGER"
          :class="
            cn(
              'relative rounded-3xl p-7',
              isLastStep(index) ? 'bg-navy-900 text-white' : 'bg-paper text-ink',
            )
          "
        >
          <span
            aria-hidden="true"
            :class="
              cn(
                'font-heading text-5xl font-black',
                isLastStep(index) ? 'text-turquoise' : 'text-turquoise/40',
              )
            "
          >
            {{ formatStepNumber(index) }}
          </span>
          <h3 class="mb-2 mt-3 text-lg font-extrabold">
            {{ $t(`home.steps.items.${key}.title`) }}
          </h3>
          <p
            :class="
              cn('text-sm leading-relaxed', isLastStep(index) ? 'text-on-navy' : 'text-ink/70')
            "
          >
            {{ $t(`home.steps.items.${key}.desc`) }}
          </p>
        </Reveal>
      </ol>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  HOME_EYEBROW_CLASS,
  HOME_SECTION_CONTAINER_CLASS,
  HOME_SECTION_TITLE_CLASS,
  HOME_STEP_KEYS,
} from '@/constants/home'
import { REVEAL_STAGGER } from '@/constants/motion'
import { cn } from '@/lib/utils'

const isLastStep = (index: number): boolean => index === HOME_STEP_KEYS.length - 1

const formatStepNumber = (index: number): string => String(index + 1).padStart(2, '0')
</script>
