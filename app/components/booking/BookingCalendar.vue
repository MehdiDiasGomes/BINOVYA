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
        :aria-label="$t('common.datePicker.previousMonth')"
        :class="CALENDAR_NAV_BUTTON_CLASS"
      >
        <Icon name="ChevronLeft" :size="18" aria-hidden="true" />
      </CalendarPrev>
      <CalendarHeading :class="CALENDAR_HEADING_CLASS" />
      <CalendarNext
        :aria-label="$t('common.datePicker.nextMonth')"
        :class="CALENDAR_NAV_BUTTON_CLASS"
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
                :class="CALENDAR_HEAD_CELL_CLASS"
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
                :class="CALENDAR_CELL_WRAPPER_CLASS"
              >
                <CalendarCellTrigger
                  :day="day"
                  :month="month.value"
                  :class="cn(CALENDAR_CELL_CLASS, isRecommended(day) && CALENDAR_RECOMMENDED_CLASS)"
                  v-bind="recommendedDayAttributes(day)"
                >
                  {{ day.day }}
                  <span
                    v-if="isRecommended(day)"
                    aria-hidden="true"
                    :class="CALENDAR_DAY_DOT_CLASS"
                  />
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
import { getLocalTimeZone, parseDate, today, type DateValue } from '@internationalized/date'
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
import type { CalendarDayAttributes, CalendarWeekStart } from '@/types/calendar'

import {
  CALENDAR_CELL_CLASS,
  CALENDAR_CELL_WRAPPER_CLASS,
  CALENDAR_DAY_DOT_CLASS,
  CALENDAR_HEAD_CELL_CLASS,
  CALENDAR_HEADING_CLASS,
  CALENDAR_NAV_BUTTON_CLASS,
  CALENDAR_RECOMMENDED_CLASS,
} from '@/constants/calendar'
import { STEP_TRANSITION } from '@/constants/motion'
import { cn } from '@/lib/utils'
import { calendarDayAttributes, mondayWeekStart } from '@/utils/calendar'

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

const { t, locale } = useI18n()

const mondayIndex: ComputedRef<CalendarWeekStart> = computed(() => mondayWeekStart(locale.value))

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

const recommendedDayAttributes = (date: DateValue): CalendarDayAttributes =>
  isRecommended(date)
    ? calendarDayAttributes(date, locale.value, (fullDate: string): string =>
        t('booking.date.recommendedDay', { date: fullDate }),
      )
    : {}

const handleSelect = (value: DateValue | undefined): void => {
  if (value) {
    emit('update:modelValue', value.toString())
  }
}
</script>
