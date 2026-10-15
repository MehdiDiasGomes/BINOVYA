<template>
  <div class="space-y-8">
    <div>
      <ul class="grid gap-4 sm:grid-cols-2">
        <li
          v-for="service in BOOKING_SERVICES"
          :key="service.slug"
          :class="
            cn(
              'flex flex-col items-center gap-3 rounded-xl border bg-white p-5 text-center transition-all duration-200 motion-reduce:transition-none',
              draft.quantities[service.slug] > 0
                ? 'border-primary bg-paper-2'
                : 'border-border hover:border-primary/60',
            )
          "
        >
          <NuxtImg
            :src="service.image"
            alt=""
            width="120"
            loading="lazy"
            :class="
              cn(
                'h-28 w-28 object-contain transition-transform duration-200 motion-reduce:transition-none',
                draft.quantities[service.slug] > 0 && 'scale-105 motion-reduce:scale-100',
              )
            "
          />
          <div>
            <h3 class="text-base font-black text-ink">{{ $t(service.titleKey) }}</h3>
            <p class="mt-0.5 text-sm text-ink/70">{{ $t(service.capacityKey) }}</p>
          </div>
          <BookingQuantityStepper
            v-model="draft.quantities[service.slug]"
            :service-name="$t(service.titleKey)"
            :max="MAX_QUANTITY_PER_SERVICE"
          />
        </li>
      </ul>

      <AnimatePresence :initial="false">
        <Motion
          v-if="isQuoteRequired"
          key="quote"
          role="status"
          :initial="{ opacity: 0, y: -STEP_OFFSET / 2 }"
          :animate="{ opacity: 1, y: 0 }"
          :exit="{ opacity: 0, y: -STEP_OFFSET / 2 }"
          :transition="STEP_TRANSITION"
          class="mt-4 flex items-start gap-3 rounded-xl border border-primary/30 bg-paper-2 p-4 text-sm text-ink"
        >
          <Icon
            name="FileText"
            :size="20"
            aria-hidden="true"
            class="mt-0.5 shrink-0 text-primary"
          />
          <div>
            <p class="font-bold">{{ $t('booking.bins.quote.title') }}</p>
            <p class="mt-0.5">{{ $t('booking.bins.quote.text') }}</p>
            <NuxtLink
              :to="localePath('/quote')"
              class="mt-2 inline-block font-bold underline underline-offset-4 hover:text-primary"
            >
              {{ $t('booking.bins.quote.cta') }}
            </NuxtLink>
          </div>
        </Motion>
      </AnimatePresence>
    </div>

    <Separator />

    <div class="space-y-4">
      <p class="flex items-start gap-2.5 text-sm text-ink/70">
        <Icon name="CalendarDays" :size="16" aria-hidden="true" class="mt-0.5 shrink-0" />
        {{ $t('booking.collection.hint') }}
      </p>
      <BookingCollectionField kind="household" />
    </div>

    <Separator />

    <BookingCollectionField kind="recycling" />
  </div>
</template>

<script setup lang="ts">
import { BOOKING_SERVICES, MAX_QUANTITY_PER_SERVICE } from '@/constants/booking'
import { STEP_OFFSET, STEP_TRANSITION } from '@/constants/motion'
import { cn } from '@/lib/utils'

const localePath = useLocalePath()
const { draft } = useBookingDraft()
const { isQuoteRequired } = useBookingPrice()
</script>
