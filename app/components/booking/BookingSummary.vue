<template>
  <aside
    aria-labelledby="booking-summary-title"
    class="h-fit rounded-2xl border border-border bg-white p-6 shadow-sm lg:sticky lg:top-24"
  >
    <h2 id="booking-summary-title" class="text-lg font-black text-ink">
      {{ $t('booking.summary.title') }}
    </h2>

    <dl class="mt-5 space-y-4 text-sm">
      <div>
        <dt class="text-xs font-black uppercase tracking-[1.2px] text-ink/70">
          {{ $t('booking.summary.address') }}
        </dt>
        <AnimatePresence :initial="false">
          <Motion
            :key="draft.address?.label ?? 'empty'"
            as="dd"
            :initial="{ opacity: 0, y: -FEEDBACK_OFFSET }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="STEP_TRANSITION"
            class="mt-1 font-semibold text-ink"
          >
            {{ draft.address?.label ?? $t('booking.summary.empty') }}
          </Motion>
        </AnimatePresence>
      </div>

      <div>
        <dt class="text-xs font-black uppercase tracking-[1.2px] text-ink/70">
          {{ $t('booking.summary.bins') }}
        </dt>
        <dd class="mt-1 font-semibold text-ink">
          <span v-if="selectedServices.length === 0">{{ $t('booking.summary.empty') }}</span>
          <ul v-else class="space-y-1">
            <AnimatePresence :initial="false">
              <Motion
                v-for="service in selectedServices"
                :key="service.slug"
                as="li"
                :initial="{ opacity: 0, y: -FEEDBACK_OFFSET }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="STEP_TRANSITION"
              >
                {{
                  $t('booking.summary.line', {
                    quantity: draft.quantities[service.slug],
                    service: $t(service.titleKey),
                  })
                }}
              </Motion>
            </AnimatePresence>
          </ul>
        </dd>
      </div>

      <div>
        <dt class="text-xs font-black uppercase tracking-[1.2px] text-ink/70">
          {{ $t('booking.summary.plan') }}
        </dt>
        <AnimatePresence :initial="false">
          <Motion
            :key="draft.plan"
            as="dd"
            :initial="{ opacity: 0, y: -FEEDBACK_OFFSET }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="STEP_TRANSITION"
            class="mt-1 font-semibold text-ink"
          >
            {{ $t(`booking.plans.${draft.plan}.title`) }}
          </Motion>
        </AnimatePresence>
      </div>

      <div>
        <dt class="text-xs font-black uppercase tracking-[1.2px] text-ink/70">
          {{ $t('booking.summary.date') }}
        </dt>
        <AnimatePresence :initial="false">
          <Motion
            :key="draft.date ?? 'empty'"
            as="dd"
            :initial="{ opacity: 0, y: -FEEDBACK_OFFSET }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="STEP_TRANSITION"
            class="mt-1 font-semibold capitalize text-ink"
          >
            {{ draft.date ? formatLongDate(draft.date, locale) : $t('booking.summary.empty') }}
          </Motion>
        </AnimatePresence>
      </div>
    </dl>

    <div class="mt-5 flex items-baseline justify-between border-t border-border pt-4">
      <span class="text-sm font-black text-ink">{{ $t('booking.summary.total') }}</span>
      <span class="text-2xl font-black text-ink" aria-live="polite">
        <AnimatePresence :initial="false">
          <Motion
            :key="totalLabel"
            as="span"
            :initial="{ opacity: 0.4, y: -STEP_OFFSET / 4 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="STEP_TRANSITION"
            class="inline-block"
          >
            {{ totalLabel }}
          </Motion>
        </AnimatePresence>
      </span>
    </div>
    <p class="mt-1 text-right text-xs text-ink/70">{{ $t('booking.summary.taxNote') }}</p>
  </aside>
</template>

<script setup lang="ts">
import type { BookingService } from '@/types/booking'

import { BOOKING_SERVICES } from '@/constants/booking'
import { FEEDBACK_OFFSET, STEP_OFFSET, STEP_TRANSITION } from '@/constants/motion'

const { t, locale } = useI18n()
const { draft } = useBookingDraft()
const { priceCents, isQuoteRequired } = useBookingPrice()

const selectedServices: ComputedRef<BookingService[]> = computed(() =>
  BOOKING_SERVICES.filter(service => draft.value.quantities[service.slug] > 0),
)

const totalLabel: ComputedRef<string> = computed(() => {
  if (isQuoteRequired.value) {
    return t('booking.summary.quote')
  }
  return priceCents.value === null ? '—' : formatPrice(priceCents.value, locale.value)
})
</script>
