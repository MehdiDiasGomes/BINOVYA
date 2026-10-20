<template>
  <nav :aria-label="$t('pro.steps.progressLabel')">
    <p class="text-sm font-bold text-ink">
      {{ $t('pro.steps.counter', { current: props.currentStep, total: props.steps.length }) }}
    </p>
    <ol role="list" class="mt-1 grid grid-cols-4 gap-1.5">
      <li v-for="step in props.steps" :key="step.id" :class="cn('min-w-0', PRO_STEP_SEGMENT_CLASS)">
        <span aria-hidden="true" :class="cn(PRO_STEP_BAR_CLASS, PRO_STEP_BAR_TONES[step.state])" />
        <span
          v-if="step.state === 'current'"
          aria-current="step"
          class="absolute inset-0 rounded-sm"
        >
          <span class="sr-only">{{ stepLabel(step) }}</span>
        </span>
        <NuxtLink
          v-else
          :to="{ query: { ...route.query, [PRO_STEP_QUERY]: String(step.number) } }"
          :class="cn('absolute inset-0 rounded-sm', PRO_STEP_LINK_CLASS)"
        >
          <span class="sr-only">{{ stepLabel(step) }}</span>
        </NuxtLink>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import type { ProStepItem } from '@/types/proSteps'

import {
  PRO_STEP_BAR_CLASS,
  PRO_STEP_BAR_TONES,
  PRO_STEP_LINK_CLASS,
  PRO_STEP_QUERY,
  PRO_STEP_SEGMENT_CLASS,
} from '@/constants/proSteps'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    steps?: ProStepItem[]
    currentStep?: number
  }>(),
  {
    steps: () => [],
    currentStep: 1,
  },
)

const { t } = useI18n()

const route = useRoute()

const stepLabel = (step: ProStepItem): string =>
  [
    t('pro.steps.stepNumber', { number: step.number }),
    t(`pro.steps.names.${step.id}`),
    t(`pro.steps.states.${step.state}`),
  ].join(' ')
</script>
