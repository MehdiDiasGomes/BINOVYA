<template>
  <div class="space-y-10">
    <ul class="space-y-4">
      <li
        v-for="service in BOOKING_SERVICES"
        :key="service.slug"
        :class="
          cn(
            'flex flex-col gap-4 rounded-xl border bg-white p-4 transition-colors sm:flex-row sm:items-center',
            draft.quantities[service.slug] > 0 ? 'border-primary' : 'border-border',
          )
        "
      >
        <NuxtImg
          :src="service.image"
          alt=""
          width="96"
          loading="lazy"
          class="h-24 w-24 shrink-0 self-center object-contain"
        />
        <div class="flex-1">
          <h3 class="text-base font-black text-ink">{{ $t(service.titleKey) }}</h3>
          <p class="mt-0.5 text-sm text-ink/70">{{ $t(service.descriptionKey) }}</p>
          <p class="mt-2 text-sm text-ink">
            <span class="font-black">{{ formatPrice(service.firstUnitPriceCents, locale) }}</span>
            {{ $t('booking.services.firstUnit') }},
            <span class="font-black">
              {{ formatPrice(service.additionalUnitPriceCents, locale) }}
            </span>
            {{ $t('booking.services.additionalUnit') }}
          </p>
        </div>
        <BookingQuantityStepper
          v-model="draft.quantities[service.slug]"
          :service-name="$t(service.titleKey)"
          :max="MAX_QUANTITY_PER_SERVICE"
          class="self-center"
        />
      </li>
    </ul>

    <fieldset>
      <legend class="text-lg font-black text-ink">{{ $t('booking.collection.title') }}</legend>
      <p class="mt-1 text-sm text-ink/70">{{ $t('booking.collection.description') }}</p>

      <div class="mt-4 flex flex-wrap gap-2">
        <label
          v-for="weekday in WEEKDAYS_MONDAY_FIRST"
          :key="weekday"
          :for="`booking-collection-${weekday}`"
          class="cursor-pointer"
        >
          <input
            :id="`booking-collection-${weekday}`"
            type="checkbox"
            class="peer sr-only"
            :checked="draft.collectionWeekdays.includes(weekday)"
            @change="toggleWeekday(weekday)"
          />
          <span
            class="flex h-11 items-center rounded-full border border-ink/25 bg-white px-4 text-sm font-bold capitalize text-ink transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary/40"
          >
            {{ formatWeekday(weekday, locale) }}
          </span>
        </label>
      </div>

      <label
        for="booking-collection-unknown"
        class="mt-4 flex w-fit cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink"
      >
        <input
          id="booking-collection-unknown"
          type="checkbox"
          class="h-5 w-5 rounded border-ink/40 accent-primary"
          :checked="draft.isCollectionUnknown"
          @change="toggleUnknown"
        />
        {{ $t('booking.collection.unknown') }}
      </label>
    </fieldset>
  </div>
</template>

<script setup lang="ts">
import {
  BOOKING_SERVICES,
  MAX_QUANTITY_PER_SERVICE,
  WEEKDAYS_MONDAY_FIRST,
} from '@/constants/booking'
import { cn } from '@/lib/utils'

const { locale } = useI18n()
const { draft } = useBookingDraft()

const toggleWeekday = (weekday: number): void => {
  const selected: number[] = draft.value.collectionWeekdays
  draft.value.collectionWeekdays = selected.includes(weekday)
    ? selected.filter(day => day !== weekday)
    : [...selected, weekday]
  draft.value.isCollectionUnknown = false
}

const toggleUnknown = (): void => {
  draft.value.isCollectionUnknown = !draft.value.isCollectionUnknown
  if (draft.value.isCollectionUnknown) {
    draft.value.collectionWeekdays = []
  }
}
</script>
