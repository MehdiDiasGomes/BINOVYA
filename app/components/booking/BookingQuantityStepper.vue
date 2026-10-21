<template>
  <div class="flex items-center gap-1.5">
    <AppButton
      variant="secondary"
      size="icon"
      :aria-disabled="props.modelValue <= 0"
      :aria-label="$t('booking.bins.decrease', { service: props.serviceName })"
      @click="update(-1)"
    >
      <Icon name="Minus" :size="18" aria-hidden="true" />
    </AppButton>
    <p class="w-10 text-center text-lg font-black text-ink" aria-live="polite">
      <AnimatePresence :initial="false">
        <Motion
          :key="props.modelValue"
          as="span"
          aria-hidden="true"
          :initial="{ opacity: 0, y: -FEEDBACK_OFFSET }"
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
    <AppButton
      variant="secondary"
      size="icon"
      :aria-disabled="props.modelValue >= props.max"
      :aria-label="$t('booking.bins.increase', { service: props.serviceName })"
      @click="update(1)"
    >
      <Icon name="Plus" :size="18" aria-hidden="true" />
    </AppButton>
  </div>
</template>

<script setup lang="ts">
import { FEEDBACK_OFFSET, STEP_TRANSITION } from '@/constants/motion'

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
