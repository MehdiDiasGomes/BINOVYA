<template>
  <CalendarRoot
    #default="{ grid, weekDays }"
    v-model:placeholder="placeholder"
    :model-value="selectedDate"
    :min-value="minDate"
    :max-value="maxDate"
    :is-date-unavailable="isDateUnavailable"
    :locale="locale"
    :week-starts-on="mondayIndex"
    :calendar-label="$t('booking.date.calendarLabel')"
    weekday-format="short"
    fixed-weeks
    prevent-deselect
    class="rounded-xl border border-border bg-white p-3 sm:p-5"
    @update:model-value="handleSelect"
  >
    <CalendarHeader class="mb-3 flex items-center justify-between">
      <CalendarPrev
        :aria-label="$t('booking.date.previousMonth')"
        :class="
          cn(
            NAV_BUTTON_CLASS,
            'transition-[color,background-color,border-color,transform] duration-150 motion-safe:not-data-[disabled]:active:scale-95',
          )
        "
      >
        <Icon name="ChevronLeft" :size="18" aria-hidden="true" />
      </CalendarPrev>
      <CalendarHeading class="font-heading text-base font-black capitalize text-ink" />
      <CalendarNext
        :aria-label="$t('booking.date.nextMonth')"
        :class="
          cn(
            NAV_BUTTON_CLASS,
            'transition-[color,background-color,border-color,transform] duration-150 motion-safe:not-data-[disabled]:active:scale-95',
          )
        "
      >
        <Icon name="ChevronRight" :size="18" aria-hidden="true" />
      </CalendarNext>
    </CalendarHeader>

    <AnimatePresence :initial="false">
      <Motion
        v-for="month in grid"
        :key="month.value.toString()"
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :transition="STEP_TRANSITION"
      >
        <CalendarGrid class="w-full border-collapse">
          <CalendarGridHead>
            <CalendarGridRow class="flex">
              <CalendarHeadCell
                v-for="day in weekDays"
                :key="day"
                class="flex-1 pb-2 text-center text-xs font-bold uppercase text-ink/70"
              >
                {{ day }}
              </CalendarHeadCell>
            </CalendarGridRow>
          </CalendarGridHead>
          <CalendarGridBody>
            <CalendarGridRow
              v-for="(week, index) in month.rows"
              :key="`week-${index}`"
              class="flex"
            >
              <CalendarCell
                v-for="day in week"
                :key="day.toString()"
                :date="day"
                class="flex-1 p-0.5"
              >
                <CalendarCellTrigger
                  :day="day"
                  :month="month.value"
                  :class="
                    cn(
                      CELL_CLASS,
                      'transition-[color,background-color,transform] duration-150 motion-safe:not-data-[disabled]:not-data-[unavailable]:active:scale-95',
                      isRecommended(day) && RECOMMENDED_CLASS,
                    )
                  "
                >
                  {{ day.day }}
                  <template v-if="isRecommended(day)">
                    <span class="sr-only">{{ $t('booking.date.recommendedSuffix') }}</span>
                    <span
                      aria-hidden="true"
                      class="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-current"
                    />
                  </template>
                </CalendarCellTrigger>
              </CalendarCell>
            </CalendarGridRow>
          </CalendarGridBody>
        </CalendarGrid>
      </Motion>
    </AnimatePresence>
  </CalendarRoot>
</template>

<script setup lang="ts">
import {
  getDayOfWeek,
  getLocalTimeZone,
  parseDate,
  today,
  type DateValue,
} from '@internationalized/date'
import {
  CalendarCell,
  CalendarCellTrigger,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHead,
  CalendarGridRow,
  CalendarHeadCell,
  CalendarHeader,
  CalendarHeading,
  CalendarNext,
  CalendarPrev,
  CalendarRoot,
} from 'reka-ui'

import type { DayAvailability } from '@/types/booking'

import { STEP_TRANSITION } from '@/constants/motion'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    days?: Map<string, DayAvailability>
  }>(),
  {
    modelValue: null,
    days: () => new Map(),
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const NAV_BUTTON_CLASS =
  'flex h-10 w-10 items-center justify-center rounded-lg border border-ink/50 text-ink transition-colors hover:border-primary hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40'

const CELL_CLASS =
  'relative flex h-11 w-full cursor-pointer items-center justify-center rounded-lg text-sm font-bold text-ink transition-colors hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 data-[outside-view]:invisible data-[disabled]:cursor-not-allowed data-[disabled]:font-medium data-[disabled]:text-ink/35 data-[disabled]:hover:bg-transparent data-[unavailable]:cursor-not-allowed data-[unavailable]:font-medium data-[unavailable]:text-ink/35 data-[unavailable]:line-through data-[unavailable]:hover:bg-transparent data-[selected]:bg-primary data-[selected]:text-white data-[selected]:hover:bg-primary'

const RECOMMENDED_CLASS =
  'bg-turquoise/15 ring-1 ring-inset ring-turquoise-deep data-[selected]:ring-0'

const KNOWN_MONDAY = '2024-01-01'

const { locale } = useI18n()

const mondayIndex: ComputedRef<0 | 1 | 2 | 3 | 4 | 5 | 6> = computed(
  () => getDayOfWeek(parseDate(KNOWN_MONDAY), locale.value) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
)

const dayKeys: ComputedRef<string[]> = computed(() => [...props.days.keys()])

const minDate: ComputedRef<DateValue> = computed(() => {
  const [first] = dayKeys.value
  return first ? parseDate(first) : today(getLocalTimeZone())
})

const maxDate: ComputedRef<DateValue> = computed(() => {
  const last: string | undefined = dayKeys.value.at(-1)
  return last ? parseDate(last) : today(getLocalTimeZone())
})

const selectedDate: ComputedRef<DateValue | undefined> = computed(() =>
  props.modelValue ? parseDate(props.modelValue) : undefined,
)

const placeholder: Ref<DateValue> = ref(selectedDate.value ?? minDate.value) as Ref<DateValue>

watch(selectedDate, value => {
  if (value) {
    placeholder.value = value
  }
})

const isDateUnavailable = (date: DateValue): boolean =>
  props.days.get(date.toString())?.status !== 'available'

const isRecommended = (date: DateValue): boolean => {
  const day: DayAvailability | undefined = props.days.get(date.toString())
  return day?.status === 'available' && day.isRecommended
}

const handleSelect = (value: DateValue | undefined): void => {
  if (value) {
    emit('update:modelValue', value.toString())
  }
}
</script>
