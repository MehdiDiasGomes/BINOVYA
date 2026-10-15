<template>
  <nav :aria-label="$t('booking.steps.ariaLabel')">
    <p class="sr-only" aria-live="polite">
      {{ $t('booking.steps.progress', { current: currentIndex + 1, total: props.steps.length }) }}
    </p>
    <ol class="flex items-center gap-2 sm:gap-3">
      <li
        v-for="(step, index) in props.steps"
        :key="step"
        :aria-current="index === currentIndex ? 'step' : undefined"
        class="flex flex-1 items-center gap-2 sm:gap-3"
      >
        <span
          :class="
            cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black transition-all duration-300 motion-reduce:transition-none',
              index < currentIndex && 'border-turquoise bg-turquoise text-navy-950',
              index === currentIndex &&
                'scale-110 border-turquoise bg-transparent text-turquoise motion-reduce:scale-100',
              index > currentIndex && 'border-white/25 text-white/60',
            )
          "
        >
          <Icon v-if="index < currentIndex" name="Check" :size="16" aria-hidden="true" />
          <span v-else aria-hidden="true">{{ index + 1 }}</span>
        </span>
        <span
          :class="
            cn(
              'hidden text-[13px] font-bold sm:block',
              index <= currentIndex ? 'text-white' : 'text-white/60',
            )
          "
        >
          {{ $t(`booking.steps.${step}`) }}
          <span v-if="index < currentIndex" class="sr-only">
            ({{ $t('booking.steps.completed') }})
          </span>
        </span>
        <span
          v-if="index < props.steps.length - 1"
          aria-hidden="true"
          class="relative h-0.5 flex-1 overflow-hidden rounded-full bg-white/15"
        >
          <span
            :class="
              cn(
                'absolute inset-0 origin-left rounded-full bg-turquoise transition-transform duration-300 ease-out motion-reduce:transition-none',
                index < currentIndex ? 'scale-x-100' : 'scale-x-0',
              )
            "
          />
        </span>
      </li>
    </ol>
    <p class="mt-3 text-sm font-bold text-white sm:hidden" aria-hidden="true">
      {{ currentIndex + 1 }}/{{ props.steps.length }} · {{ $t(`booking.steps.${props.current}`) }}
    </p>
  </nav>
</template>

<script setup lang="ts">
import type { BookingStepId } from '@/types/booking'

import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    steps?: BookingStepId[]
    current?: BookingStepId
  }>(),
  {
    steps: () => [],
    current: 'contact',
  },
)

const currentIndex: ComputedRef<number> = computed(() => props.steps.indexOf(props.current))
</script>
