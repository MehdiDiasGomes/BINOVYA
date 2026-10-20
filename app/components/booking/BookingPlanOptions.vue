<template>
  <fieldset>
    <legend class="text-base font-black text-ink">{{ $t('booking.plans.legend') }}</legend>
    <p class="mt-1 text-sm text-ink/70">{{ $t('booking.plans.description') }}</p>

    <div class="mt-4 grid gap-3 sm:grid-cols-3">
      <label
        v-for="plan in BOOKING_PLANS"
        :key="plan"
        :for="`booking-plan-${plan}`"
        class="group cursor-pointer"
      >
        <input
          :id="`booking-plan-${plan}`"
          type="radio"
          name="booking-plan"
          :value="plan"
          :checked="plan === props.modelValue"
          class="peer sr-only"
          @change="emit('update:modelValue', plan)"
        />
        <span
          class="flex h-full flex-col rounded-xl border-2 border-border bg-white p-4 transition-[translate,scale,border-color] duration-press ease-brand [@media(hover:hover)]:group-hover:-translate-y-px [@media(hover:hover)]:group-hover:border-primary group-active:translate-y-0 group-active:scale-[0.98] motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 motion-reduce:group-active:scale-100 peer-checked:border-primary peer-checked:bg-paper-2 peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2"
        >
          <span class="flex items-center justify-between gap-2">
            <span class="text-sm font-black text-ink">
              {{ $t(`booking.plans.${plan}.title`) }}
            </span>
            <Icon
              name="CircleCheck"
              :size="18"
              aria-hidden="true"
              class="hidden shrink-0 text-primary group-has-[:checked]:block group-has-[:checked]:animate-in group-has-[:checked]:fade-in group-has-[:checked]:zoom-in-50 group-has-[:checked]:duration-press motion-reduce:animate-none"
            />
          </span>
          <span class="mt-0.5 text-[13px] text-ink/70">
            {{ $t(`booking.plans.${plan}.description`) }}
          </span>
          <span class="mt-3 text-xl font-black text-ink">
            {{ formatPlanPrice(plan) }}
          </span>
          <span class="text-xs text-ink/70">{{ $t('booking.plans.perVisit') }}</span>
        </span>
      </label>
    </div>

    <p
      v-if="props.hasGridError"
      role="alert"
      :class="cn('mt-3 text-sm font-bold', ERROR_TEXT_TONE_CLASS)"
    >
      {{ $t('booking.plans.gridError') }}
    </p>
  </fieldset>
</template>

<script setup lang="ts">
import type { BookingPlan } from '@/types/booking'

import { BOOKING_PLANS } from '@/constants/booking'
import { ERROR_TEXT_TONE_CLASS } from '@/constants/feedback'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue?: BookingPlan
    priceFor?: (plan: BookingPlan) => number | null
    hasGridError?: boolean
  }>(),
  {
    modelValue: 'one_off',
    priceFor: (): null => null,
    hasGridError: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: BookingPlan]
}>()

const { locale } = useI18n()

const formatPlanPrice = (plan: BookingPlan): string => {
  const cents: number | null = props.priceFor(plan)
  return cents === null ? '—' : formatPrice(cents, locale.value)
}
</script>
