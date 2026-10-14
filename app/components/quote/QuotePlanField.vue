<template>
  <fieldset>
    <legend class="text-lg font-black text-ink">{{ $t('quote.plan.legend') }}</legend>
    <p class="mt-1 text-sm text-ink/70">{{ $t('quote.plan.description') }}</p>

    <div class="mt-4 flex flex-wrap gap-2">
      <label
        v-for="option in PLAN_OPTIONS"
        :key="option.value"
        :for="`quote-plan-${option.value}`"
        class="cursor-pointer"
      >
        <input
          :id="`quote-plan-${option.value}`"
          v-model="selected"
          type="radio"
          name="quote-plan"
          :value="option.value"
          class="peer sr-only"
        />
        <span
          class="flex h-11 items-center rounded-full border border-ink/25 bg-white px-4 text-sm font-bold text-ink transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary/40"
        >
          {{ $t(option.labelKey) }}
        </span>
      </label>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import type { BookingPlan } from '@/types/booking'

type PlanOption = {
  value: BookingPlan | 'undecided'
  labelKey: string
}

const props = withDefaults(
  defineProps<{
    modelValue?: BookingPlan | null
  }>(),
  {
    modelValue: null,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: BookingPlan | null]
}>()

const PLAN_OPTIONS: PlanOption[] = [
  { value: 'undecided', labelKey: 'quote.plan.undecided' },
  { value: 'one_off', labelKey: 'booking.plans.one_off.title' },
  { value: 'quarterly', labelKey: 'booking.plans.quarterly.title' },
  { value: 'annual', labelKey: 'booking.plans.annual.title' },
]

const selected: WritableComputedRef<BookingPlan | 'undecided'> = computed({
  get: () => props.modelValue ?? 'undecided',
  set: (value: BookingPlan | 'undecided') =>
    emit('update:modelValue', value === 'undecided' ? null : value),
})
</script>
