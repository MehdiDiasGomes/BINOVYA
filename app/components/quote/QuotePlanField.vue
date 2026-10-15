<template>
  <fieldset>
    <legend class="text-lg font-black text-ink">{{ $t('quote.plan.legend') }}</legend>
    <p class="mt-1 text-sm text-ink/70">{{ $t('quote.plan.description') }}</p>

    <div class="mt-4 flex flex-wrap gap-2">
      <label
        v-for="option in PLAN_OPTIONS"
        :key="option.value"
        :for="`quote-plan-${option.value}`"
        class="group cursor-pointer"
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
          class="flex h-11 items-center gap-2 rounded-full border border-ink/50 bg-white px-4 text-sm font-bold text-ink transition-all duration-200 group-hover:border-primary group-active:scale-[0.97] motion-reduce:transition-none motion-reduce:group-active:scale-100 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2"
        >
          <Icon
            name="Check"
            :size="16"
            aria-hidden="true"
            class="hidden group-has-[:checked]:block group-has-[:checked]:animate-in group-has-[:checked]:fade-in group-has-[:checked]:zoom-in-50 group-has-[:checked]:duration-200 motion-reduce:animate-none"
          />
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
