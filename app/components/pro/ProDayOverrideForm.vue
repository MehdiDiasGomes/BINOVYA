<template>
  <form novalidate class="space-y-5" @submit.prevent="save">
    <DatePicker
      :id="DATE_FIELD_ID"
      :model-value="props.date"
      :label="$t('pro.availability.override.date')"
      :min="today"
      :max="maxDate"
      class="max-w-sm"
      @update:model-value="emit('update:date', $event)"
    />

    <AnimatePresence :initial="false">
      <Motion
        v-if="props.date"
        key="override-details"
        :initial="{ opacity: 0, y: STEP_OFFSET }"
        :animate="{ opacity: 1, y: 0 }"
        :exit="{ opacity: 0 }"
        :transition="STEP_TRANSITION"
        class="space-y-5"
      >
        <ProCapacityField
          :id="CAPACITY_FIELD_ID"
          v-model="capacityDraft"
          class="max-w-sm"
          :label="$t('pro.availability.override.capacity')"
          :context-label="$t('pro.availability.override.capacityContext')"
          :hint="capacityHint"
          :error="capacityError"
          :fallback-value="ruleCapacity"
          is-nullable
        />

        <div class="relative z-10 max-w-xl space-y-3">
          <AnimatePresence :initial="false">
            <Motion
              v-if="storedSectorText"
              key="stored-sector"
              :initial="{ opacity: 0, y: STEP_OFFSET / 2 }"
              :animate="{ opacity: 1, y: 0 }"
              :exit="{ opacity: 0 }"
              :transition="STEP_TRANSITION"
              class="flex flex-col gap-3 rounded-xl border border-border bg-paper-2 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p class="flex min-w-0 items-start gap-2 break-words text-sm font-bold text-ink">
                <Icon name="MapPin" :size="16" aria-hidden="true" class="mt-0.5 shrink-0" />
                <span class="min-w-0">{{ storedSectorText }}</span>
              </p>
              <AppButton
                variant="secondary"
                class="w-full shrink-0 sm:w-auto"
                @click="removeStoredSector"
              >
                {{ $t('pro.availability.override.removeSector') }}
              </AppButton>
            </Motion>
          </AnimatePresence>
          <BookingAddressSearch
            :id="SECTOR_FIELD_ID"
            v-model="sectorAddress"
            kind="municipality"
            :label="$t('pro.availability.override.sector')"
            :error="sectorError"
          />
        </div>

        <div>
          <label :for="NOTE_FIELD_ID" class="block">
            <span class="mb-1.5 block text-sm font-bold text-ink">
              {{ $t('pro.availability.override.note') }}
            </span>
            <textarea
              :id="NOTE_FIELD_ID"
              v-model="noteDraft"
              rows="3"
              :maxlength="PRO_DAY_NOTE_MAX_LENGTH"
              :aria-describedby="NOTE_HINT_ID"
              :class="FIELD_TEXTAREA_CLASS"
            />
          </label>
          <span :id="NOTE_HINT_ID" :class="FIELD_HINT_CLASS">
            {{ $t('pro.availability.override.noteHint', { max: PRO_DAY_NOTE_MAX_LENGTH }) }}
          </span>
        </div>

        <div
          class="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:flex-wrap sm:items-center"
        >
          <AppButton
            ref="saveButtonRef"
            type="submit"
            :is-loading="isSaving"
            :is-disabled="isBusy"
            class="w-full sm:w-auto"
          >
            {{
              isSaving
                ? $t('pro.availability.override.saving')
                : $t('pro.availability.override.save')
            }}
          </AppButton>
          <AnimatePresence :initial="false">
            <Motion
              v-if="hasOverride"
              key="remove-override"
              as="div"
              :initial="{ opacity: 0, y: STEP_OFFSET / 2 }"
              :animate="{ opacity: 1, y: 0 }"
              :exit="{ opacity: 0 }"
              :transition="STEP_TRANSITION"
              class="w-full sm:w-auto"
            >
              <AppButton
                variant="destructive"
                :is-loading="isRemoving"
                :is-disabled="isBusy"
                class="w-full sm:w-auto"
                @click="remove"
              >
                {{ $t('pro.availability.override.remove') }}
              </AppButton>
            </Motion>
          </AnimatePresence>
          <ProFormFeedback :message="feedback" :is-error="isFeedbackError" />
        </div>
      </Motion>
    </AnimatePresence>
  </form>
</template>

<script setup lang="ts">
import type { BookingAddress } from '@/types/booking'
import type { FocusTarget } from '@/types/button'
import type { ProDayOverrideRequest, ProDayOverview, ProWeekdayRule } from '@/types/proAvailability'
import type { z } from 'zod'

import { FIELD_HINT_CLASS, FIELD_TEXTAREA_CLASS } from '@/constants/booking'
import { STEP_OFFSET, STEP_TRANSITION } from '@/constants/motion'
import {
  PRO_AVAILABILITY_HORIZON_DAYS,
  PRO_DAY_CAPACITY_MAX,
  PRO_DAY_NOTE_MAX_LENGTH,
} from '@/constants/pro'
import { addDaysToIsoDate, formatFullDate, formatWeekday, parseIsoDate } from '@/utils/date'
import { isInvalidAddressError } from '@/utils/fetchError'
import { focusFirstElement } from '@/utils/focus'
import {
  daySectorText,
  hasDayOverride,
  isNotableDay,
  weekdayCapacity,
} from '@/utils/proAvailability'
import { dayCapacitySchema, normalizeDayNote } from '@/utils/proAvailabilityValidation'

const props = withDefaults(
  defineProps<{
    date?: string
    day?: ProDayOverview | null
    rules?: ProWeekdayRule[]
  }>(),
  {
    date: '',
    day: null,
    rules: () => [],
  },
)

const emit = defineEmits<{
  'update:date': [value: string]
  pending: []
  saved: [message: string]
  failed: [message: string]
}>()

const DATE_FIELD_ID: string = 'pro-override-date'
const CAPACITY_FIELD_ID: string = 'pro-override-capacity'
const SECTOR_FIELD_ID: string = 'pro-override-sector'
const NOTE_FIELD_ID: string = 'pro-override-note'
const NOTE_HINT_ID: string = `${NOTE_FIELD_ID}-hint`

const { t, locale } = useI18n()
const today: Readonly<Ref<string>> = useBusinessToday()
const { handleAuthError } = useProAuthError()

const capacityDraft: Ref<number | null> = ref(null)
const noteDraft: Ref<string> = ref('')
const sectorAddress: Ref<BookingAddress | null> = ref(null)
const isStoredSectorRemoved: Ref<boolean> = ref(false)
const capacityError: Ref<string> = ref('')
const sectorError: Ref<string> = ref('')
const feedback: Ref<string> = ref('')
const isFeedbackError: Ref<boolean> = ref(false)
const isSaving: Ref<boolean> = ref(false)
const isRemoving: Ref<boolean> = ref(false)
const saveButtonRef: Ref<FocusTarget | null> = ref(null)
let isResetPending: boolean = false

const maxDate: ComputedRef<string> = computed(() =>
  addDaysToIsoDate(today.value, PRO_AVAILABILITY_HORIZON_DAYS),
)

const isBusy: ComputedRef<boolean> = computed(() => isSaving.value || isRemoving.value)

const weekday: ComputedRef<number> = computed(() =>
  props.date ? parseIsoDate(props.date).getDay() : 0,
)

const weekdayName: ComputedRef<string> = computed(() => formatWeekday(weekday.value, locale.value))

const ruleCapacity: ComputedRef<number> = computed(() =>
  weekdayCapacity(props.rules, weekday.value),
)

const hasOverride: ComputedRef<boolean> = computed(() =>
  props.day ? hasDayOverride(props.day) : false,
)

const storedSectorText: ComputedRef<string> = computed(() =>
  props.day && !isStoredSectorRemoved.value ? daySectorText(props.day, locale.value, t) : '',
)

const ruleText: ComputedRef<string> = computed(() =>
  t(
    'pro.availability.override.rule',
    { weekday: weekdayName.value, n: ruleCapacity.value },
    ruleCapacity.value,
  ),
)

const capacityHint: ComputedRef<string> = computed(
  () =>
    `${ruleText.value} ${t('pro.availability.override.capacityHint', { max: PRO_DAY_CAPACITY_MAX })}`,
)

const dateLabel = (): string => formatFullDate(props.date, locale.value)

const resetDrafts = (): void => {
  const day: ProDayOverview | null = props.day
  capacityDraft.value = day?.capacitySource === 'override' ? day.capacity : null
  noteDraft.value = day?.note ?? ''
  sectorAddress.value = null
  isStoredSectorRemoved.value = false
  capacityError.value = ''
  sectorError.value = ''
}

watch(
  () => props.date,
  (): void => {
    isResetPending = false
    feedback.value = ''
    resetDrafts()
  },
  { immediate: true },
)

watch(capacityDraft, (): void => {
  capacityError.value = ''
})

watch(
  () => props.day,
  (): void => {
    if (isResetPending) {
      isResetPending = false
      resetDrafts()
    }
  },
)

const resetAfterRefresh = (savedDay: ProDayOverview | null): void => {
  if (!props.day && !(savedDay && isNotableDay(savedDay))) {
    resetDrafts()
    return
  }
  isResetPending = true
}

const report = (message: string, isError: boolean): void => {
  feedback.value = message
  isFeedbackError.value = isError
  if (isError) {
    emit('failed', message)
  } else {
    emit('saved', message)
  }
}

const removeStoredSector = async (): Promise<void> => {
  isStoredSectorRemoved.value = true
  await nextTick()
  focusFirstElement([SECTOR_FIELD_ID])
}

const sectorPayload = (): Pick<ProDayOverrideRequest, 'sector'> => {
  if (sectorAddress.value) {
    return { sector: sectorAddress.value }
  }
  return isStoredSectorRemoved.value ? { sector: null } : {}
}

const buildRequest = (): ProDayOverrideRequest | null => {
  const capacity: z.SafeParseReturnType<number | null, number | null> = dayCapacitySchema
    .nullable()
    .safeParse(capacityDraft.value)
  if (!capacity.success) {
    capacityError.value = t('pro.availability.errors.capacity', { max: PRO_DAY_CAPACITY_MAX })
    focusFirstElement([CAPACITY_FIELD_ID])
    return null
  }
  return {
    maxBookings: capacity.data,
    note: normalizeDayNote(noteDraft.value),
    ...sectorPayload(),
  }
}

const reportSaveFailure = async (error: unknown): Promise<void> => {
  const isSectorRefused: boolean = isInvalidAddressError(error)
  sectorError.value = isSectorRefused ? t('pro.availability.errors.sector') : ''
  report(isSectorRefused ? sectorError.value : t('pro.availability.override.saveError'), true)
  if (isSectorRefused) {
    await nextTick()
    focusFirstElement([SECTOR_FIELD_ID])
  }
}

const save = async (): Promise<void> => {
  if (isBusy.value || !props.date) {
    return
  }
  capacityError.value = ''
  sectorError.value = ''
  const request: ProDayOverrideRequest | null = buildRequest()
  if (!request) {
    report(t('pro.availability.override.invalid'), true)
    return
  }
  isSaving.value = true
  emit('pending')
  try {
    const savedDay: ProDayOverview | null = await $fetch<ProDayOverview | null>(
      `/api/pro/availability/overrides/${encodeURIComponent(props.date)}`,
      { method: 'PUT', body: request },
    )
    resetAfterRefresh(savedDay)
    report(t('pro.availability.override.saved', { date: dateLabel() }), false)
  } catch (error: unknown) {
    if (!(await handleAuthError(error))) {
      await reportSaveFailure(error)
    }
  } finally {
    isSaving.value = false
  }
}

const remove = async (): Promise<void> => {
  if (isBusy.value || !props.date) {
    return
  }
  isRemoving.value = true
  emit('pending')
  try {
    const savedDay: ProDayOverview | null = await $fetch<ProDayOverview | null>(
      `/api/pro/availability/overrides/${encodeURIComponent(props.date)}`,
      { method: 'DELETE' },
    )
    resetAfterRefresh(savedDay)
    saveButtonRef.value?.focus()
    report(
      t('pro.availability.override.removed', { date: dateLabel(), weekday: weekdayName.value }),
      false,
    )
  } catch (error: unknown) {
    if (!(await handleAuthError(error))) {
      report(t('pro.availability.override.removeError'), true)
    }
  } finally {
    isRemoving.value = false
  }
}
</script>
