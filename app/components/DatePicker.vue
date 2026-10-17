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
            :aria-describedby="describedBy"
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
          :aria-label="props.label"
          align="start"
          :class="cn(FLOATING_PANEL_CLASS, 'w-auto max-w-[calc(100vw-1rem)] p-2 sm:p-4')"
          @open-auto-focus.prevent
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
            :fixed-weeks="false"
            prevent-deselect
            initial-focus
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
                      :day="day"
                      :month="month.value"
                      :class="CALENDAR_CELL_CLASS"
                    />
                  </CalendarCell>
                </CalendarGridRow>
              </CalendarGridBody>
            </CalendarGrid>
          </CalendarRoot>
        </PopoverContent>
      </Popover>
      <button
        v-if="isClearable"
        type="button"
        :class="cn(SECONDARY_BUTTON_CLASS, 'size-12 shrink-0 px-0')"
        @click="clear"
      >
        <Icon name="X" :size="16" aria-hidden="true" />
        <span class="sr-only">{{ $t('common.datePicker.clear', { label: props.label }) }}</span>
      </button>
    </div>
    <span v-if="props.error" :id="`${props.id}-error`" role="alert" :class="FIELD_ERROR_CLASS">
      <Icon name="CircleAlert" :size="14" aria-hidden="true" />
      {{ props.error }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { parseDate, type DateValue } from '@internationalized/date'
import { CalendarCellTrigger, CalendarRoot } from 'reka-ui'

import type { CalendarWeekStart } from '@/types/calendar'

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
  CALENDAR_NAV_BUTTON_CLASS,
  FIELD_ERROR_CLASS,
  FIELD_INPUT_CLASS,
  FLOATING_PANEL_CLASS,
} from '@/constants/booking'
import { SECONDARY_BUTTON_CLASS } from '@/constants/buttons'
import { cn } from '@/lib/utils'
import { mondayWeekStart } from '@/utils/calendar'
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
  }>(),
  {
    modelValue: '',
    min: '',
    max: '',
    error: '',
    isRequired: true,
    isLabelHidden: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t, locale } = useI18n()
const today: Readonly<Ref<string>> = useBusinessToday()
const isOpen: Ref<boolean> = ref(false)

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

watch(isOpen, (open: boolean): void => {
  if (open) {
    placeholder.value = selectedDate.value ?? defaultMonthDate()
  }
})

const isClearable: ComputedRef<boolean> = computed(
  () => !props.isRequired && Boolean(selectedDate.value),
)

const visibleText: ComputedRef<string> = computed(() =>
  selectedDate.value
    ? formatMediumDate(props.modelValue, locale.value)
    : t('common.datePicker.placeholder'),
)

const describedBy: ComputedRef<string | undefined> = computed(() =>
  describedByIds(props.id, '', props.error),
)

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
