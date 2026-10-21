<template>
  <div class="space-y-5">
    <div
      v-if="!nextAvailable"
      role="status"
      class="flex items-start gap-3 rounded-xl border border-amber-700/30 bg-amber-50 p-4"
    >
      <Icon
        name="TriangleAlert"
        :size="20"
        aria-hidden="true"
        class="mt-0.5 shrink-0 text-amber-700"
      />
      <div class="text-sm text-ink">
        <p class="font-bold">{{ $t('booking.date.empty') }}</p>
        <NuxtLink
          :to="localePath('/contact')"
          class="mt-1.5 inline-block font-bold underline underline-offset-4 hover:text-primary"
        >
          {{ $t('booking.date.emptyCta') }}
        </NuxtLink>
      </div>
    </div>

    <div
      v-else
      class="flex flex-col gap-3 rounded-xl bg-navy-950 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p class="text-xs font-black uppercase tracking-[1.2px] text-turquoise">
          {{
            nextAvailable.isRecommended
              ? $t('booking.date.nextRecommended')
              : $t('booking.date.nextAvailable')
          }}
        </p>
        <p class="mt-0.5 text-base font-black capitalize text-white">
          {{ formatLongDate(nextAvailable.date, locale) }}
        </p>
      </div>
      <button
        v-if="draft.date !== nextAvailable.date"
        type="button"
        class="flex h-11 items-center justify-center gap-2 rounded-lg bg-turquoise px-4 text-sm font-black text-navy-950 transition-all duration-150 hover:bg-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60 motion-reduce:transition-none motion-reduce:active:scale-100"
        @click="draft.date = nextAvailable.date"
      >
        <Icon name="CalendarCheck" :size="16" aria-hidden="true" />
        {{ $t('booking.date.pickSuggested') }}
      </button>
    </div>

    <BookingCalendar v-model="draft.date" :days="days" />

    <div>
      <h3 class="sr-only">{{ $t('booking.date.legend.title') }}</h3>
      <ul class="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink">
        <li v-if="hasCollectionDays" class="flex items-center gap-2">
          <span
            aria-hidden="true"
            class="relative flex h-6 w-6 items-center justify-center rounded-md bg-turquoise/15 ring-1 ring-inset ring-turquoise-deep"
          >
            <span class="absolute bottom-0.5 h-1.5 w-1.5 rounded-full bg-ink" />
          </span>
          {{ $t('booking.date.legend.recommended') }}
        </li>
        <li class="flex items-center gap-2">
          <span
            aria-hidden="true"
            class="flex h-6 w-6 items-center justify-center rounded-md border border-ink/50 text-[11px] font-bold"
          >
            8
          </span>
          {{ $t('booking.date.legend.available') }}
        </li>
        <li class="flex items-center gap-2">
          <span
            aria-hidden="true"
            class="flex h-6 w-6 items-center justify-center rounded-md border border-ink/15 text-[11px] text-ink/35 line-through"
          >
            8
          </span>
          {{ $t('booking.date.legend.unavailable') }}
        </li>
      </ul>
      <p
        v-if="hasCollectionDays"
        class="mt-3 flex items-start gap-2.5 rounded-xl bg-paper-2 p-3.5 text-[13px] text-ink"
      >
        <Icon name="Info" :size="16" aria-hidden="true" class="mt-0.5 shrink-0 text-primary" />
        <span>
          <span class="font-bold">{{ $t('booking.date.whyRecommended.title') }}</span>
          {{ $t('booking.date.whyRecommended.text') }}
        </span>
      </p>
    </div>

    <div aria-live="polite" class="space-y-3">
      <AnimatePresence :initial="false">
        <Motion
          v-if="draft.date"
          key="selected"
          as="p"
          :initial="{ opacity: 0, y: -FEEDBACK_OFFSET }"
          :animate="{ opacity: 1, y: 0 }"
          :exit="{ opacity: 0 }"
          :transition="STEP_TRANSITION"
          class="text-sm font-bold text-ink"
        >
          {{ $t('booking.date.selected', { date: formatLongDate(draft.date, locale) }) }}
        </Motion>
        <Motion
          v-if="isSelectionOffCollection"
          key="off-collection"
          :initial="{ opacity: 0, y: -FEEDBACK_OFFSET }"
          :animate="{ opacity: 1, y: 0 }"
          :exit="{ opacity: 0 }"
          :transition="STEP_TRANSITION"
          class="flex items-start gap-3 rounded-xl border border-amber-700/30 bg-amber-50 p-4 text-sm text-ink"
        >
          <Icon
            name="TriangleAlert"
            :size="20"
            aria-hidden="true"
            class="mt-0.5 shrink-0 text-amber-700"
          />
          <p class="font-semibold">{{ $t('booking.date.notRecommended') }}</p>
        </Motion>
      </AnimatePresence>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FEEDBACK_OFFSET, STEP_TRANSITION } from '@/constants/motion'

const { locale } = useI18n()
const localePath = useLocalePath()
const { draft, collectionWeekdays } = useBookingDraft()
const { days, nextAvailable, load } = useBookingAvailability()

onMounted(() => {
  load().catch(() => undefined)
})

const hasCollectionDays: ComputedRef<boolean> = computed(() => collectionWeekdays.value.length > 0)

const isSelectionOffCollection: ComputedRef<boolean> = computed(() => {
  const { date } = draft.value
  if (!date || !hasCollectionDays.value) {
    return false
  }
  return days.value.get(date)?.isRecommended === false
})
</script>
