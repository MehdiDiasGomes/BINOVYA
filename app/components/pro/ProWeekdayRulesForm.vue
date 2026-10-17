<template>
  <form novalidate class="space-y-5" @submit.prevent="save">
    <fieldset :aria-describedby="HINT_ID">
      <legend class="sr-only">{{ $t('pro.availability.rules.legend') }}</legend>
      <p :id="HINT_ID" class="mb-4 text-sm text-ink/80">
        {{ $t('pro.availability.rules.hint', { max: PRO_DAY_CAPACITY_MAX }) }}
      </p>
      <ul class="grid grid-cols-2 items-start gap-x-3 gap-y-4 sm:grid-cols-4 sm:gap-x-4">
        <li v-for="weekday in WEEKDAYS_MONDAY_FIRST" :key="weekday" class="min-w-0">
          <ProCapacityField
            :id="fieldId(weekday)"
            :model-value="drafts[weekday] ?? null"
            :label="weekdayLabel(weekday)"
            :context-label="contextLabel(weekday)"
            :error="errors[weekday] ?? ''"
            @update:model-value="updateDraft(weekday, $event)"
          />
        </li>
      </ul>
    </fieldset>
    <div class="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
      <AppButton type="submit" :is-loading="isSaving" class="w-full sm:w-auto">
        {{ isSaving ? $t('pro.availability.rules.saving') : $t('pro.availability.rules.save') }}
      </AppButton>
      <ProFormFeedback :message="feedback" :is-error="isFeedbackError" />
    </div>
  </form>
</template>

<script setup lang="ts">
import type { ProWeekdayRule } from '@/types/proAvailability'
import type { z } from 'zod'

import { WEEKDAYS_MONDAY_FIRST } from '@/constants/booking'
import { PRO_DAY_CAPACITY_MAX } from '@/constants/pro'
import { formatWeekday } from '@/utils/date'
import { focusFirstElement } from '@/utils/focus'
import { weekdayCapacity } from '@/utils/proAvailability'
import { dayCapacitySchema } from '@/utils/proAvailabilityValidation'
import { capitalizeFirst } from '@/utils/text'

const props = withDefaults(
  defineProps<{
    rules?: ProWeekdayRule[]
  }>(),
  {
    rules: () => [],
  },
)

const emit = defineEmits<{
  pending: []
  saved: [message: string]
  failed: [message: string]
}>()

const HINT_ID: string = 'pro-rules-hint'

const { t, locale } = useI18n()
const { handleAuthError } = useProAuthError()

const drafts: Ref<Record<number, number | null>> = ref({})
const errors: Ref<Record<number, string>> = ref({})
const isSaving: Ref<boolean> = ref(false)
const feedback: Ref<string> = ref('')
const isFeedbackError: Ref<boolean> = ref(false)

const report = (message: string, isError: boolean): void => {
  feedback.value = message
  isFeedbackError.value = isError
  if (isError) {
    emit('failed', message)
  } else {
    emit('saved', message)
  }
}

watch(
  () => props.rules.map(rule => `${rule.weekday}:${rule.maxBookings}`).join(),
  (): void => {
    drafts.value = Object.fromEntries(
      WEEKDAYS_MONDAY_FIRST.map(weekday => [weekday, weekdayCapacity(props.rules, weekday)]),
    )
    errors.value = {}
  },
  { immediate: true },
)

const fieldId = (weekday: number): string => `pro-rule-${weekday}`

const weekdayLabel = (weekday: number): string =>
  capitalizeFirst(formatWeekday(weekday, locale.value), locale.value)

const contextLabel = (weekday: number): string =>
  t('pro.availability.rules.context', { day: formatWeekday(weekday, locale.value) })

const updateDraft = (weekday: number, value: number | null): void => {
  drafts.value = { ...drafts.value, [weekday]: value }
  errors.value = { ...errors.value, [weekday]: '' }
  feedback.value = ''
}

const validate = (): ProWeekdayRule[] | null => {
  const rules: ProWeekdayRule[] = []
  const nextErrors: Record<number, string> = {}
  WEEKDAYS_MONDAY_FIRST.forEach(weekday => {
    const result: z.SafeParseReturnType<number, number> = dayCapacitySchema.safeParse(
      drafts.value[weekday],
    )
    if (result.success) {
      rules.push({ weekday, maxBookings: result.data })
    } else {
      nextErrors[weekday] = t('pro.availability.errors.capacity', { max: PRO_DAY_CAPACITY_MAX })
    }
  })
  errors.value = nextErrors
  const firstInvalid: number | undefined = WEEKDAYS_MONDAY_FIRST.find(
    weekday => nextErrors[weekday],
  )
  if (firstInvalid !== undefined) {
    focusFirstElement([fieldId(firstInvalid)])
    return null
  }
  return rules
}

const save = async (): Promise<void> => {
  if (isSaving.value) {
    return
  }
  const rules: ProWeekdayRule[] | null = validate()
  if (!rules) {
    report(t('pro.availability.rules.invalid'), true)
    return
  }
  isSaving.value = true
  emit('pending')
  try {
    await $fetch<ProWeekdayRule[]>('/api/pro/availability/rules', {
      method: 'PUT',
      body: { rules },
    })
    report(t('pro.availability.rules.saved'), false)
  } catch (error: unknown) {
    if (!(await handleAuthError(error))) {
      report(t('pro.availability.rules.saveError'), true)
    }
  } finally {
    isSaving.value = false
  }
}
</script>
