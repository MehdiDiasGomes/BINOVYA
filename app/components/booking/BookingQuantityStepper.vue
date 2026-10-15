<template>
  <div class="flex items-center gap-1.5">
    <button
      type="button"
      :aria-disabled="props.modelValue <= 0"
      :aria-label="$t('booking.bins.decrease', { service: props.serviceName })"
      class="flex h-11 w-11 items-center justify-center rounded-lg border border-ink/50 bg-white text-ink transition-all duration-150 motion-safe:not-aria-disabled:active:scale-95 motion-reduce:transition-none hover:border-primary hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
      @click="update(-1)"
    >
      <Icon name="Minus" :size="18" aria-hidden="true" />
    </button>
    <p class="w-10 text-center text-lg font-black text-ink" aria-live="polite">
      <AnimatePresence :initial="false">
        <Motion
          :key="props.modelValue"
          as="span"
          aria-hidden="true"
          :initial="{ opacity: 0, y: -STEP_OFFSET / 2 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="STEP_TRANSITION"
          class="inline-block"
        >
          {{ props.modelValue }}
        </Motion>
      </AnimatePresence>
      <span class="sr-only">
        {{ props.serviceName }} :
        {{ $t('booking.bins.quantityStatus', { count: props.modelValue }) }}
      </span>
    </p>
    <button
      type="button"
      :aria-disabled="props.modelValue >= props.max"
      :aria-label="$t('booking.bins.increase', { service: props.serviceName })"
      class="flex h-11 w-11 items-center justify-center rounded-lg border border-ink/50 bg-white text-ink transition-all duration-150 motion-safe:not-aria-disabled:active:scale-95 motion-reduce:transition-none hover:border-primary hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
      @click="update(1)"
    >
      <Icon name="Plus" :size="18" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { STEP_OFFSET, STEP_TRANSITION } from '@/constants/motion'

const props = withDefaults(
  defineProps<{
    modelValue?: number
    serviceName?: string
    max?: number
  }>(),
  {
    modelValue: 0,
    serviceName: '',
    max: 10,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const update = (delta: number): void => {
  const next: number = Math.min(props.max, Math.max(0, props.modelValue + delta))
  emit('update:modelValue', next)
}
</script>
