<template>
  <section aria-labelledby="professionals-process-title" class="bg-paper-2 py-20">
    <div class="mx-auto max-w-[1180px] px-4 sm:px-8">
      <Reveal class="mb-12 text-center">
        <span class="mb-2.5 block text-[12.5px] font-black uppercase tracking-[1.5px] text-ink/70">
          {{ $t('professionals.process.eyebrow') }}
        </span>
        <h2 id="professionals-process-title" class="text-[32px] font-black leading-tight text-ink">
          {{ $t('professionals.process.title') }}
        </h2>
      </Reveal>

      <ol class="grid gap-6 md:grid-cols-3">
        <Reveal
          v-for="(step, index) in STEPS"
          :key="step"
          as="li"
          :delay="index * REVEAL_STAGGER"
          class="rounded-2xl border border-border bg-white p-7 shadow-sm"
        >
          <span
            aria-hidden="true"
            class="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-lg font-black text-white"
          >
            {{ index + 1 }}
          </span>
          <h3 class="mb-2 text-lg font-black text-ink">
            {{ $t(`professionals.process.steps.${step}.title`) }}
          </h3>
          <p class="text-sm leading-relaxed text-ink/70">
            {{ $t(`professionals.process.steps.${step}.desc`) }}
          </p>
        </Reveal>
      </ol>

      <Reveal class="mt-8 flex items-start gap-4 rounded-2xl bg-navy-950 p-6 sm:p-7">
        <Icon name="Info" :size="22" aria-hidden="true" class="mt-0.5 shrink-0 text-turquoise" />
        <div>
          <h3 class="text-base font-black text-white">
            {{ $t('professionals.process.why.title') }}
          </h3>
          <p class="mt-1.5 text-sm leading-relaxed text-[#c4d6e2]">
            {{ $t('professionals.process.why.text') }}
          </p>
        </div>
      </Reveal>
    </div>
  </section>
</template>

<script setup lang="ts">
import { REVEAL_STAGGER } from '@/constants/motion'

const STEPS: string[] = ['request', 'quote', 'intervention']
</script>
