<template>
  <div>
    <span
      :id="`${props.id}-label`"
      :class="cn('mb-1.5 block text-sm font-bold text-ink', props.isLabelHidden && 'sr-only')"
    >
      {{ props.label }}
    </span>
    <div class="flex gap-2">
      <Popover v-model:open="isOpen">
        <PopoverTrigger as-child>
          <button
            :id="props.id"
            type="button"
            :aria-labelledby="`${props.id}-label ${props.id}`"
            :aria-describedby="ariaDescribedBy"
            :aria-invalid="props.error ? 'true' : undefined"
            :class="
              cn(
                FIELD_INPUT_CLASS,
                'flex min-w-0 cursor-pointer items-center gap-2 text-left',
                props.error ? 'border-destructive' : 'hover:border-primary',
              )
            "
          >
            <Icon name="CalendarDays" :size="16" aria-hidden="true" class="shrink-0" />
            <span :class="cn('truncate', !selectedDate && 'text-ink/70')">
              {{ visibleText }}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          v-if="isPanelMounted"
          :aria-label="$t('common.datePicker.dialog', { label: props.label })"
          side="bottom"
          align="start"
          :side-flip="false"
          :collision-padding="8"
          :class="
            cn(
              FLOATING_PANEL_CLASS,
              'w-auto max-h-(--reka-popover-content-available-height) max-w-[calc(100vw-1rem)] overflow-x-hidden overflow-y-auto p-2 sm:p-4',
            )
          "
          @open-auto-focus="focusCalendarDay"
        >
          <CalendarRoot
            #default="{ grid, weekDays }"
            v-model:placeholder="placeholder"
            :model-value="selectedDate"
            :min-value="minDate"
            :max-value="maxDate"
            :locale="locale"
            :week-starts-on="weekStart"
            :calendar-label="$t('common.datePicker.calendar')"
            weekday-format="short"
            fixed-weeks
            prevent-deselect
            class="w-[min(20rem,calc(100vw-2rem-2px))]"
            @update:model-value="handleSelect"
          >
            <CalendarHeader class="mb-3 flex items-center justify-between p-0">
              <CalendarPrevButton
                :aria-label="$t('common.datePicker.previousMonth')"
                :class="CALENDAR_NAV_BUTTON_CLASS"
              />
              <CalendarHeading :class="CALENDAR_HEADING_CLASS" />
              <CalendarNextButton
                :aria-label="$t('common.datePicker.nextMonth')"
                :class="CALENDAR_NAV_BUTTON_CLASS"
              />
            </CalendarHeader>
            <CalendarGrid v-for="month in grid" :key="month.value.toString()">
              <CalendarGridHead>
                <CalendarGridRow>
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
                <CalendarGridRow v-for="(week, index) in month.rows" :key="`week-${index}`">
                  <CalendarCell
                    v-for="day in week"
                    :key="day.toString()"
                    :date="day"
                    :class="CALENDAR_CELL_WRAPPER_CLASS"
                  >
                    <CalendarCellTrigger
                      #default="{ dayValue }"
                      :day="day"
                      :month="month.value"
                      :class="CALENDAR_CELL_CLASS"
                      v-bind="markedDayAttributes(day)"
                    >
                      {{ dayValue }}
                      <span
                        v-if="markedDayCount(day) > 0"
                        aria-hidden="true"
                        :class="CALENDAR_MARKED_DAY_DOT_CLASS"
                      />
                    </CalendarCellTrigger>
                  </CalendarCell>
                </CalendarGridRow>
              </CalendarGridBody>
            </CalendarGrid>
          </CalendarRoot>
          <p v-if="hasMarkedDays" class="mt-3 flex items-center gap-2 px-1 text-sm text-ink/70">
            <span aria-hidden="true" :class="CALENDAR_MARKED_DOT_CLASS" />
            {{ $t('common.datePicker.markedLegend') }}
          </p>
        </PopoverContent>
      </Popover>
      <AppButton
        v-if="isClearable"
        variant="secondary"
        icon="X"
        class="size-12 shrink-0 px-0"
        @click="clear"
      >
        <span class="sr-only">{{ $t('common.datePicker.clear', { label: props.label }) }}</span>
      </AppButton>
    </div>
    <span v-if="props.error" :id="`${props.id}-error`" role="alert" :class="FIELD_ERROR_CLASS">
      <Icon name="CircleAlert" :size="14" aria-hidden="true" />
      {{ props.error }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { parseDate, startOfMonth, type DateValue } from '@internationalized/date'
import { CalendarCellTrigger, CalendarRoot } from 'reka-ui'
import { getLastFirstDayOfWeek } from 'reka-ui/date'

import type {
  CalendarDayAttributes,
  CalendarVisibleRange,
  CalendarWeekStart,
} from '@/types/calendar'

import {
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHead,
  CalendarGridRow,
  CalendarHeadCell,
  CalendarHeader,
  CalendarHeading,
  CalendarNextButton,
  CalendarPrevButton,
} from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  CALENDAR_CELL_CLASS,
  CALENDAR_CELL_WRAPPER_CLASS,
  CALENDAR_HEAD_CELL_CLASS,
  CALENDAR_HEADING_CLASS,
  CALENDAR_MARKED_DAY_DOT_CLASS,
  CALENDAR_MARKED_DOT_CLASS,
  CALENDAR_NAV_BUTTON_CLASS,
  FIELD_ERROR_CLASS,
  FIELD_INPUT_CLASS,
  FLOATING_PANEL_CLASS,
} from '@/constants/booking'
import { CALENDAR_GRID_DAY_COUNT } from '@/constants/calendar'
import { cn } from '@/lib/utils'
import { calendarDayAttributes, mondayWeekStart } from '@/utils/calendar'
import { formatMediumDate } from '@/utils/date'
import { isIsoDate } from '@/utils/dateValidation'
import { describedByIds } from '@/utils/field'
import { focusFirstElement } from '@/utils/focus'

const props = withDefaults(
  defineProps<{
    id: string
    label: string
    modelValue?: string
    min?: string
    max?: string
    error?: string
    isRequired?: boolean
    isLabelHidden?: boolean
    describedBy?: string
    markedDays?: Record<string, number>
  }>(),
  {
    modelValue: '',
    min: '',
    max: '',
    error: '',
    isRequired: true,
    isLabelHidden: false,
    describedBy: undefined,
    markedDays: () => ({}),
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  visibleRange: [range: CalendarVisibleRange]
}>()

const CALENDAR_FOCUSED_DAY_SELECTOR: string = '[data-reka-calendar-cell-trigger][tabindex="0"]'

const ISO_MONTH_LENGTH: number = 7

const { t, locale } = useI18n()
const today: Readonly<Ref<string>> = useBusinessToday()
const isOpen: Ref<boolean> = ref(false)
const isPanelMounted: Ref<boolean> = ref(false)

const toDateValue = (value: string): DateValue | undefined =>
  isIsoDate(value) ? parseDate(value) : undefined

const selectedDate: ComputedRef<DateValue | undefined> = computed(() =>
  toDateValue(props.modelValue),
)

const minDate: ComputedRef<DateValue | undefined> = computed(() => toDateValue(props.min))

const maxDate: ComputedRef<DateValue | undefined> = computed(() => toDateValue(props.max))

const weekStart: ComputedRef<CalendarWeekStart> = computed(() => mondayWeekStart(locale.value))

const defaultMonthDate = (): DateValue => {
  const fallback: DateValue = parseDate(today.value)
  if (minDate.value && fallback.compare(minDate.value) < 0) {
    return minDate.value
  }
  return maxDate.value && fallback.compare(maxDate.value) > 0 ? maxDate.value : fallback
}

const placeholder: Ref<DateValue> = ref(selectedDate.value ?? defaultMonthDate()) as Ref<DateValue>

const visibleFrom: ComputedRef<DateValue> = computed(() =>
  getLastFirstDayOfWeek(startOfMonth(placeholder.value), weekStart.value, locale.value),
)

const visibleFromKey: ComputedRef<string> = computed(() => visibleFrom.value.toString())

let emittedFrom: string = ''

const emitVisibleRange = (): void => {
  if (visibleFromKey.value === emittedFrom) {
    return
  }
  emittedFrom = visibleFromKey.value
  emit('visibleRange', {
    from: visibleFrom.value.toString(),
    to: visibleFrom.value.add({ days: CALENDAR_GRID_DAY_COUNT - 1 }).toString(),
  })
}

watch(isOpen, (open: boolean): void => {
  if (open) {
    isPanelMounted.value = true
    placeholder.value = selectedDate.value ?? defaultMonthDate()
    emitVisibleRange()
    return
  }
  emittedFrom = ''
})

watch(visibleFromKey, (): void => {
  if (isOpen.value) {
    emitVisibleRange()
  }
})

const markedDayCount = (day: DateValue): number => props.markedDays[day.toString()] ?? 0

const markedDayAttributes = (day: DateValue): CalendarDayAttributes => {
  const count: number = markedDayCount(day)
  return count > 0
    ? calendarDayAttributes(day, locale.value, (date: string): string =>
        t('common.datePicker.markedDay', { date, total: count }, count),
      )
    : {}
}

const visibleMonthKey: ComputedRef<string> = computed(() =>
  startOfMonth(placeholder.value).toString().slice(0, ISO_MONTH_LENGTH),
)

const hasMarkedDays: ComputedRef<boolean> = computed(() =>
  Object.entries(props.markedDays).some(
    ([date, count]: [string, number]): boolean =>
      count > 0 && date.slice(0, ISO_MONTH_LENGTH) === visibleMonthKey.value,
  ),
)

const isClearable: ComputedRef<boolean> = computed(
  () => !props.isRequired && Boolean(selectedDate.value),
)

const visibleText: ComputedRef<string> = computed(() =>
  selectedDate.value
    ? formatMediumDate(props.modelValue, locale.value)
    : t('common.datePicker.placeholder'),
)

const ariaDescribedBy: ComputedRef<string | undefined> = computed(
  () =>
    [describedByIds(props.id, '', props.error), props.describedBy]
      .filter((value: string | undefined): value is string => Boolean(value))
      .join(' ') || undefined,
)

/**
 * Moves focus to the selected or current day when the calendar panel opens.
 * @param event - `openAutoFocus` event of the popover content
 */
const focusCalendarDay = (event: Event): void => {
  const day: HTMLElement | null =
    event.target instanceof HTMLElement
      ? event.target.querySelector<HTMLElement>(CALENDAR_FOCUSED_DAY_SELECTOR)
      : null
  if (day) {
    event.preventDefault()
    day.focus()
  }
}

const handleSelect = (value: DateValue | undefined): void => {
  if (value) {
    emit('update:modelValue', value.toString())
  }
  isOpen.value = false
}

const clear = async (): Promise<void> => {
  emit('update:modelValue', '')
  await nextTick()
  focusFirstElement([props.id])
}
</script>
