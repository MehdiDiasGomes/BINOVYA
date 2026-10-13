<template>
  <section aria-labelledby="professionals-audiences-title" class="bg-paper-2 py-20">
    <div class="mx-auto max-w-[1180px] px-4 sm:px-8">
      <Reveal class="mb-12 text-center">
        <span class="mb-2.5 block text-[12.5px] font-black uppercase tracking-[1.5px] text-ink/70">
          {{ $t('professionals.audiences.eyebrow') }}
        </span>
        <h2
          id="professionals-audiences-title"
          class="text-[32px] font-black leading-tight text-ink"
        >
          {{ $t('professionals.audiences.title') }}
        </h2>
      </Reveal>

      <ul class="grid gap-6 md:grid-cols-2">
        <Reveal
          v-for="(audience, index) in AUDIENCES"
          :key="audience.key"
          as="li"
          :delay="index * REVEAL_STAGGER"
          class="rounded-2xl border border-border bg-white p-7 shadow-sm"
        >
          <span
            class="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-navy-950 text-turquoise"
          >
            <Icon :name="audience.icon" :size="24" aria-hidden="true" />
          </span>
          <h3 class="mb-2 text-lg font-black text-ink">
            {{ $t(`professionals.audiences.items.${audience.key}.title`) }}
          </h3>
          <p class="text-sm leading-relaxed text-ink/70">
            {{ $t(`professionals.audiences.items.${audience.key}.desc`) }}
          </p>
        </Reveal>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { LucideIconName } from '@/constants/clients'

import { REVEAL_STAGGER } from '@/constants/motion'

type Audience = {
  key: string
  icon: LucideIconName
}

const AUDIENCES: Audience[] = [
  { key: 'authorities', icon: 'Landmark' },
  { key: 'businesses', icon: 'Store' },
]
</script>
