<template>
  <nav :aria-label="$t('pro.steps.progressLabel')">
    <p class="text-sm font-bold text-ink">
      {{ $t('pro.steps.counter', { current: props.currentStep, total: props.steps.length }) }}
    </p>
    <ol class="mt-3 grid grid-cols-4 gap-1.5 sm:gap-2">
      <li v-for="step in props.steps" :key="step.id" class="min-w-0">
        <span
          v-if="step.state === 'current'"
          aria-current="step"
          :class="cn(PRO_STEP_ITEM_CLASS, 'border-primary bg-primary text-white')"
        >
          <span aria-hidden="true" class="font-heading text-base font-black leading-5">{{
            step.number
          }}</span>
          <span class="sr-only">{{ $t('pro.steps.stepNumber', { number: step.number }) }}</span>
          <span class="hyphens-auto break-words text-xs font-bold">{{
            $t(`pro.steps.names.${step.id}`)
          }}</span>
          <span class="sr-only">{{ $t('pro.steps.states.current') }}</span>
        </span>
        <NuxtLink
          v-else
          :to="{ query: { ...route.query, [PRO_STEP_QUERY]: String(step.number) } }"
          :class="
            cn(
              PRO_STEP_ITEM_CLASS,
              PRO_STEP_LINK_CLASS,
              'border-border bg-white text-ink hover:border-primary',
            )
          "
        >
          <Icon
            v-if="step.state === 'done'"
            name="Check"
            :size="18"
            aria-hidden="true"
            class="my-px shrink-0"
          />
          <span v-else aria-hidden="true" class="font-heading text-base font-black leading-5">
            {{ step.number }}
          </span>
          <span class="sr-only">{{ $t('pro.steps.stepNumber', { number: step.number }) }}</span>
          <span class="hyphens-auto break-words text-xs font-bold">{{
            $t(`pro.steps.names.${step.id}`)
          }}</span>
          <span :class="cn('text-xs text-ink/80', step.state === 'todo' && 'sr-only')">
            {{ $t(`pro.steps.states.${step.state}`) }}
          </span>
        </NuxtLink>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import type { ProStepItem } from '@/types/proSteps'

import { PRO_STEP_ITEM_CLASS, PRO_STEP_LINK_CLASS, PRO_STEP_QUERY } from '@/constants/proSteps'
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

const route = useRoute()
</script>
