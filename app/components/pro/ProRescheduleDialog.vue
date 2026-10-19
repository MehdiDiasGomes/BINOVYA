<template>
  <DialogRoot :open="props.open" @update:open="handleOpenChange">
    <DialogPortal>
      <DialogOverlay :class="PRO_DIALOG_OVERLAY_CLASS" />
      <DialogContent
        :class="
          cn(
            PRO_DIALOG_CONTENT_CLASS,
            'flex min-h-[min(37.5rem,calc(100dvh-1rem))] flex-col sm:block sm:min-h-0',
          )
        "
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
          :aria-disabled="isSubmitting || undefined"
          class="absolute right-3 top-3 flex size-11 items-center justify-center rounded-lg text-ink/70 transition-colors duration-press ease-brand hover:bg-paper-2 hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-disabled:hover:bg-transparent aria-disabled:hover:text-ink/70 motion-reduce:transition-none"
        >
          <Icon name="X" :size="18" aria-hidden="true" />
          <span class="sr-only">{{ $t('pro.reschedule.close') }}</span>
        </DialogClose>

        <form
          class="mt-5 flex flex-1 flex-col gap-4 sm:flex-none"
          novalidate
          @submit.prevent="submit(false)"
        >
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

          <div class="mt-auto flex flex-col-reverse gap-3 pt-2 sm:mt-0 sm:flex-row sm:justify-end">
            <DialogClose as-child>
              <AppButton variant="secondary" :is-disabled="isSubmitting">
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
import {
  PRO_AVAILABILITY_HORIZON_DAYS,
  PRO_DIALOG_CONTENT_CLASS,
  PRO_DIALOG_OVERLAY_CLASS,
  PRO_RESCHEDULE_TIMEOUT_MS,
} from '@/constants/pro'
import { cn } from '@/lib/utils'
import { addDaysToIsoDate, formatFullDate } from '@/utils/date'
import { isFetchTimeoutError, readFetchErrorCode } from '@/utils/fetchError'
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
  stale: []
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
const pendingMove: Ref<ProRescheduledEvent | null> = ref(null)
const isStale: Ref<boolean> = ref(false)
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
      pendingMove.value = null
      isStale.value = false
      clearFeedback()
    }
  },
)

const handleOpenChange = (value: boolean): void => {
  if (value || !isSubmitting.value) {
    emit('update:open', value)
  }
}

const selectDate = (date: string): void => {
  draftDate.value = date
  clearFeedback()
}

const refusalText = (error: unknown, code: unknown): string => {
  if (isFetchTimeoutError(error)) {
    return t('pro.reschedule.errors.timeout')
  }
  return isRescheduleErrorCode(code)
    ? t(`pro.reschedule.errors.${code}`, { date: formatFullDate(maxDate.value, locale.value) })
    : t('pro.reschedule.errors.generic')
}

const showRefusal = async (error: unknown, wasForced: boolean): Promise<void> => {
  const code: unknown = readFetchErrorCode(error)
  if (isFetchTimeoutError(error)) {
    isStale.value = true
  }
  refusal.value = refusalText(error, code)
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
      {
        method: 'POST',
        body: { date: draftDate.value, force },
        timeout: PRO_RESCHEDULE_TIMEOUT_MS,
      },
    )
    pendingMove.value = { ...response, intervention }
    emit('update:open', false)
  } catch (error: unknown) {
    if (await handleAuthError(error)) {
      isStale.value = false
      emit('update:open', false)
      return
    }
    await showRefusal(error, force)
  } finally {
    isSubmitting.value = false
  }
}

/**
 * Restores focus once the content unmounted, after its exit animation. After a move or a timeout,
 * it leaves focus to the page reload and tells the parent one tick later: the event fires while the
 * content unmounts, before the modal's `onUnmounted` lifts `aria-hidden` from the page, whose live
 * region would otherwise miss the announcement.
 * Relies on reka-ui FocusScope emitting during `scope.stop()`, before the modal's post-flush
 * `onUnmounted` (reka-ui 2.7, Vue 3.5).
 * @param event - `closeAutoFocus` event of the dialog content
 */
const handleCloseAutoFocus = async (event: Event): Promise<void> => {
  const moved: ProRescheduledEvent | null = pendingMove.value
  if (moved || isStale.value) {
    event.preventDefault()
    pendingMove.value = null
    isStale.value = false
    await nextTick()
    if (moved) {
      emit('rescheduled', moved)
    } else {
      emit('stale')
    }
    return
  }
  if (props.trigger?.isConnected) {
    event.preventDefault()
    props.trigger.focus()
  }
}
</script>
