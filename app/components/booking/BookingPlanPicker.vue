<template>
  <fieldset>
    <legend class="text-base font-black text-ink">{{ $t('booking.plans.legend') }}</legend>
    <p class="mt-1 text-sm text-ink/70">{{ $t('booking.plans.description') }}</p>

    <div class="mt-4 grid gap-3 sm:grid-cols-3">
      <label
        v-for="plan in BOOKING_PLANS"
        :key="plan"
        :for="`booking-plan-${plan}`"
        class="cursor-pointer"
      >
        <input
          :id="`booking-plan-${plan}`"
          v-model="draft.plan"
          type="radio"
          name="booking-plan"
          :value="plan"
          class="peer sr-only"
        />
        <span
          class="flex h-full flex-col rounded-xl border-2 border-border bg-white p-4 transition-colors peer-checked:border-primary peer-checked:bg-paper-2 peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary/40"
        >
          <span class="text-sm font-black text-ink">{{ $t(`booking.plans.${plan}.title`) }}</span>
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

    <p v-if="hasGridError" role="alert" class="mt-3 text-sm font-bold text-destructive">
      {{ $t('booking.plans.gridError') }}
    </p>
  </fieldset>
</template>

<script setup lang="ts">
import type { BookingPlan } from '@/types/booking'

import { BOOKING_PLANS } from '@/constants/booking'

const { locale } = useI18n()
const { draft } = useBookingDraft()
const { priceFor, hasGridError } = useBookingPrice()

const formatPlanPrice = (plan: BookingPlan): string => {
  const cents: number | null = priceFor(plan)
  return cents === null ? '—' : formatPrice(cents, locale.value)
}
</script>
