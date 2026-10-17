<template>
  <DialogRoot :open="props.open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay :class="PRO_DIALOG_OVERLAY_CLASS" />
      <DialogContent
        class="fixed inset-x-0 bottom-0 z-50 max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-t-2xl border border-border bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink shadow-lg ease-brand focus-visible:outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-12 data-[state=closed]:duration-press data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-12 data-[state=open]:duration-lift sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100vw-2rem)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95 motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none"
        @open-auto-focus.prevent="focusFirstElement([DATE_FIELD_ID])"
        @close-auto-focus="handleCloseAutoFocus"
      >
        <p class="sr-only" role="status">
          {{ isSubmitting ? $t('pro.reschedule.submittingStatus') : '' }}
        </p>
        <DialogTitle class="pr-12 font-heading text-xl font-black leading-tight">
          {{ $t('pro.reschedule.title') }}
        </DialogTitle>
        <DialogDescription class="mt-2 break-words text-sm text-ink/80">
          {{ description }}
        </DialogDescription>
        <DialogClose
          class="absolute right-3 top-3 flex size-11 items-center justify-center rounded-lg text-ink/70 transition-colors duration-press ease-brand hover:bg-paper-2 hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary motion-reduce:transition-none"
        >
          <Icon name="X" :size="18" aria-hidden="true" />
          <span class="sr-only">{{ $t('pro.reschedule.close') }}</span>
        </DialogClose>

        <form class="mt-5 space-y-4" novalidate @submit.prevent="submit(false)">
          <DatePicker
            :id="DATE_FIELD_ID"
            :model-value="draftDate"
            :label="$t('pro.reschedule.dateLabel')"
            :min="today"
            :max="maxDate"
            :error="dateError"
            :described-by="refusal ? REFUSAL_ID : undefined"
            @update:model-value="selectDate"
          />

          <div
            v-if="refusal"
            class="space-y-3 rounded-xl border border-destructive/50 bg-destructive/5 p-4"
          >
            <p
              :id="REFUSAL_ID"
              role="alert"
              class="flex items-start gap-2 break-words text-sm font-bold text-red-700"
            >
              <Icon name="CircleAlert" :size="16" aria-hidden="true" class="mt-0.5 shrink-0" />
              {{ refusal }}
            </p>
            <AnimatePresence :initial="false">
              <Motion
                v-if="isForceable"
                key="force"
                as="div"
                :initial="{ opacity: 0, y: STEP_OFFSET / 2 }"
                :animate="{ opacity: 1, y: 0 }"
                :exit="{ opacity: 0 }"
                :transition="STEP_TRANSITION"
              >
                <AppButton
                  variant="destructive"
                  icon="TriangleAlert"
                  :is-disabled="isSubmitting"
                  class="w-full"
                  @click="submit(true)"
                >
                  {{ $t('pro.reschedule.force') }}
                </AppButton>
              </Motion>
            </AnimatePresence>
          </div>

          <div class="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <DialogClose as-child>
              <AppButton variant="secondary">
                {{ $t('pro.reschedule.cancel') }}
              </AppButton>
            </DialogClose>
            <AppButton ref="submitButtonRef" type="submit" :is-loading="isSubmitting">
              {{ isSubmitting ? $t('pro.reschedule.submitting') : $t('pro.reschedule.submit') }}
            </AppButton>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'

import type { FocusTarget } from '@/types/button'
import type { ProIntervention } from '@/types/pro'
import type { ProRescheduledEvent, ProRescheduleResponse } from '@/types/proAvailability'

import { STEP_OFFSET, STEP_TRANSITION } from '@/constants/motion'
import { PRO_AVAILABILITY_HORIZON_DAYS, PRO_DIALOG_OVERLAY_CLASS } from '@/constants/pro'
import { addDaysToIsoDate, formatFullDate } from '@/utils/date'
import { readFetchErrorCode } from '@/utils/fetchError'
import { focusFirstElement } from '@/utils/focus'
import { isForceableRescheduleCode, isRescheduleErrorCode } from '@/utils/proAvailability'
import { proCustomerName } from '@/utils/proIntervention'

const props = withDefaults(
  defineProps<{
    open?: boolean
    intervention?: ProIntervention | null
    trigger?: HTMLElement | null
  }>(),
  {
    open: false,
    intervention: null,
    trigger: null,
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  rescheduled: [moved: ProRescheduledEvent]
}>()

const DATE_FIELD_ID: string = 'pro-reschedule-date'

const REFUSAL_ID: string = 'pro-reschedule-refusal'

const { t, locale } = useI18n()
const today: Readonly<Ref<string>> = useBusinessToday()
const { handleAuthError } = useProAuthError()

const draftDate: Ref<string> = ref('')
const dateError: Ref<string> = ref('')
const refusal: Ref<string> = ref('')
const isForceable: Ref<boolean> = ref(false)
const isSubmitting: Ref<boolean> = ref(false)
const isMoved: Ref<boolean> = ref(false)
const submitButtonRef: Ref<FocusTarget | null> = ref(null)

const maxDate: ComputedRef<string> = computed(() =>
  addDaysToIsoDate(today.value, PRO_AVAILABILITY_HORIZON_DAYS),
)

const description: ComputedRef<string> = computed(() =>
  props.intervention
    ? t('pro.reschedule.description', {
        name: proCustomerName(props.intervention.customer, t),
        address: props.intervention.address,
        date: formatFullDate(props.intervention.scheduledDate, locale.value),
      })
    : '',
)

const clearFeedback = (): void => {
  dateError.value = ''
  refusal.value = ''
  isForceable.value = false
}

watch(
  () => props.open,
  (open: boolean): void => {
    if (open) {
      draftDate.value = ''
      isMoved.value = false
      isSubmitting.value = false
      clearFeedback()
    }
  },
)

const selectDate = (date: string): void => {
  draftDate.value = date
  clearFeedback()
}

const refusalText = (code: unknown): string =>
  isRescheduleErrorCode(code)
    ? t(`pro.reschedule.errors.${code}`, { date: formatFullDate(maxDate.value, locale.value) })
    : t('pro.reschedule.errors.generic')

const showRefusal = async (error: unknown, wasForced: boolean): Promise<void> => {
  const code: unknown = readFetchErrorCode(error)
  refusal.value = refusalText(code)
  isForceable.value = !wasForced && isForceableRescheduleCode(code)
  if (!isForceable.value) {
    await nextTick()
    submitButtonRef.value?.focus()
  }
}

const submit = async (force: boolean): Promise<void> => {
  const intervention: ProIntervention | null = props.intervention
  if (isSubmitting.value || !intervention) {
    return
  }
  if (!draftDate.value) {
    dateError.value = t('pro.reschedule.errors.dateRequired')
    focusFirstElement([DATE_FIELD_ID])
    return
  }
  isSubmitting.value = true
  try {
    const response: ProRescheduleResponse = await $fetch<ProRescheduleResponse>(
      `/api/pro/bookings/${encodeURIComponent(intervention.id)}/reschedule`,
      { method: 'POST', body: { date: draftDate.value, force } },
    )
    isMoved.value = true
    emit('update:open', false)
    emit('rescheduled', { ...response, intervention })
  } catch (error: unknown) {
    if (await handleAuthError(error)) {
      emit('update:open', false)
      return
    }
    await showRefusal(error, force)
  } finally {
    isSubmitting.value = false
  }
}

const handleCloseAutoFocus = (event: Event): void => {
  if (isMoved.value) {
    event.preventDefault()
    return
  }
  if (props.trigger?.isConnected) {
    event.preventDefault()
    props.trigger.focus()
  }
}
</script>
