<template>
  <div class="flex items-center gap-1.5">
    <button
      type="button"
      :disabled="props.modelValue <= 0"
      :aria-label="$t('booking.services.decrease', { service: props.serviceName })"
      class="flex h-11 w-11 items-center justify-center rounded-lg border border-ink/25 bg-white text-ink transition-colors hover:border-primary hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
      @click="update(-1)"
    >
      <Icon name="Minus" :size="18" aria-hidden="true" />
    </button>
    <p class="w-10 text-center text-lg font-black text-ink" aria-live="polite">
      <span aria-hidden="true">{{ props.modelValue }}</span>
      <span class="sr-only">
        {{ props.serviceName }} :
        {{ $t('booking.services.quantityStatus', { count: props.modelValue }) }}
      </span>
    </p>
    <button
      type="button"
      :disabled="props.modelValue >= props.max"
      :aria-label="$t('booking.services.increase', { service: props.serviceName })"
      class="flex h-11 w-11 items-center justify-center rounded-lg border border-ink/25 bg-white text-ink transition-colors hover:border-primary hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
      @click="update(1)"
    >
      <Icon name="Plus" :size="18" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
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
