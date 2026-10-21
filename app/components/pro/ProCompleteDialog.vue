<template>
  <AlertDialogRoot :open="props.open" @update:open="handleOpenChange">
    <AlertDialogPortal>
      <AlertDialogOverlay :class="PRO_DIALOG_OVERLAY_CLASS" />
      <AlertDialogContent
        :class="PRO_DIALOG_CONTENT_CLASS"
        @open-auto-focus.prevent="focusCancel"
        @close-auto-focus="handleCloseAutoFocus"
        @escape-key-down="preventWhileSubmitting"
      >
        <p class="sr-only" role="status">
          {{ isSubmitting ? $t('pro.complete.submittingStatus') : '' }}
        </p>
        <AlertDialogTitle
          :class="
            cn('font-heading text-xl font-black leading-tight', isForced && ERROR_TEXT_TONE_CLASS)
          "
        >
          {{ isForced ? $t('pro.complete.forceTitle') : $t('pro.complete.title') }}
        </AlertDialogTitle>
        <AlertDialogDescription class="mt-3 space-y-2 break-words text-sm text-ink/80">
          <span class="block">{{ subject }}</span>
          <span class="block">{{ consequence }}</span>
        </AlertDialogDescription>

        <p
          v-if="refusal"
          role="alert"
          :class="
            cn(
              INLINE_ERROR_CLASS,
              'mt-4 rounded-xl border border-destructive/50 bg-destructive/5 p-4',
            )
          "
        >
          <Icon name="CircleAlert" :size="16" aria-hidden="true" class="mt-0.5 shrink-0" />
          {{ refusal }}
        </p>

        <div class="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <AlertDialogCancel as-child>
            <AppButton ref="cancelButtonRef" variant="secondary" :is-disabled="isSubmitting">
              {{ $t('pro.complete.cancel') }}
            </AppButton>
          </AlertDialogCancel>
          <AppButton
            :variant="isForced ? 'destructive' : 'primary'"
            :icon="isForced ? 'TriangleAlert' : 'CircleCheck'"
            :is-loading="isSubmitting"
            :is-disabled="isOutcomeUnknown"
            @click="submit"
          >
            {{ submitLabel }}
          </AppButton>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>

<script setup lang="ts">
import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from 'reka-ui'

import type { FocusTarget } from '@/types/button'
import type { ProIntervention, ProInterventionPhotos, ProPhotoKind } from '@/types/pro'
import type { ProCompletedEvent, ProCompleteRequest, ProCompleteResponse } from '@/types/proPhotos'

import { ERROR_TEXT_TONE_CLASS, INLINE_ERROR_CLASS } from '@/constants/feedback'
import {
  PRO_COMPLETE_TIMEOUT_MS,
  PRO_DIALOG_CONTENT_CLASS,
  PRO_DIALOG_OVERLAY_CLASS,
} from '@/constants/pro'
import { cn } from '@/lib/utils'
import { isFetchTimeoutError, readFetchErrorCode } from '@/utils/fetchError'
import { proCustomerName } from '@/utils/proIntervention'
import { isCompleteErrorCode, missingPhotoKinds, missingPhotosLabel } from '@/utils/proPhotos'

const props = withDefaults(
  defineProps<{
    open?: boolean
    intervention?: ProIntervention | null
    photos?: ProInterventionPhotos
    trigger?: HTMLElement | null
  }>(),
  {
    open: false,
    intervention: null,
    photos: () => ({ before: false, after: false }),
    trigger: null,
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  completed: [result: ProCompletedEvent]
  stale: []
}>()

const { t } = useI18n()
const { handleAuthError } = useProAuthError()

const isSubmitting: Ref<boolean> = ref(false)
const refusal: Ref<string> = ref('')
const isMissingOnServer: Ref<boolean> = ref(false)
const isOutcomeUnknown: Ref<boolean> = ref(false)
const isStale: Ref<boolean> = ref(false)
const pendingResult: Ref<ProCompletedEvent | null> = ref(null)
const cancelButtonRef: Ref<FocusTarget | null> = ref(null)

const missingKinds: ComputedRef<ProPhotoKind[]> = computed(() => missingPhotoKinds(props.photos))

const isForced: ComputedRef<boolean> = computed(
  () => isMissingOnServer.value || missingKinds.value.length > 0,
)

const subject: ComputedRef<string> = computed(() =>
  props.intervention
    ? t('pro.complete.subject', {
        name: proCustomerName(props.intervention.customer, t),
        address: props.intervention.address,
      })
    : '',
)

const consequence: ComputedRef<string> = computed(() => {
  if (!isForced.value) {
    return t('pro.complete.withPhotos')
  }
  return t('pro.complete.withoutPhotos', { missing: missingPhotosLabel(missingKinds.value, t) })
})

const submitLabel: ComputedRef<string> = computed(() => {
  if (isSubmitting.value) {
    return t('pro.complete.submitting')
  }
  return isForced.value ? t('pro.complete.force') : t('pro.complete.submit')
})

watch(
  () => props.open,
  (open: boolean): void => {
    if (open) {
      refusal.value = ''
      isMissingOnServer.value = false
      isOutcomeUnknown.value = false
      isStale.value = false
      pendingResult.value = null
    }
  },
)

const focusCancel = async (): Promise<void> => {
  await nextTick()
  cancelButtonRef.value?.focus()
}

const handleOpenChange = (value: boolean): void => {
  if (value || !isSubmitting.value) {
    emit('update:open', value)
  }
}

const preventWhileSubmitting = (event: KeyboardEvent): void => {
  if (isSubmitting.value) {
    event.preventDefault()
  }
}

const showRefusal = (error: unknown): void => {
  const code: unknown = readFetchErrorCode(error)
  if (isFetchTimeoutError(error)) {
    isOutcomeUnknown.value = true
    isStale.value = true
    refusal.value = t('pro.complete.errors.timeout')
    return
  }
  if (code === 'missingPhotos') {
    isMissingOnServer.value = true
  }
  isStale.value = isStale.value || isCompleteErrorCode(code)
  refusal.value = isCompleteErrorCode(code)
    ? t(`pro.complete.errors.${code}`)
    : t('pro.complete.errors.generic')
}

const submit = async (): Promise<void> => {
  const intervention: ProIntervention | null = props.intervention
  if (isSubmitting.value || isOutcomeUnknown.value || !intervention) {
    return
  }
  isSubmitting.value = true
  refusal.value = ''
  const request: ProCompleteRequest = { force: isForced.value }
  try {
    const response: ProCompleteResponse = await $fetch<ProCompleteResponse>(
      `/api/pro/bookings/${encodeURIComponent(intervention.id)}/complete`,
      { method: 'POST', body: request, timeout: PRO_COMPLETE_TIMEOUT_MS },
    )
    pendingResult.value = { ...response, intervention }
    isSubmitting.value = false
    emit('update:open', false)
  } catch (error: unknown) {
    isSubmitting.value = false
    if (await handleAuthError(error)) {
      isStale.value = false
      emit('update:open', false)
      return
    }
    showRefusal(error)
  }
}

/**
 * Restores focus once the content unmounted. After a finish or a refusal that makes the list
 * outdated, it leaves focus to the page reload and tells the parent one tick later, once the modal
 * lifted `aria-hidden` from the page, whose live region would otherwise miss the announcement.
 * @param event - `closeAutoFocus` event of the dialog content
 */
const handleCloseAutoFocus = async (event: Event): Promise<void> => {
  const result: ProCompletedEvent | null = pendingResult.value
  if (result || isStale.value) {
    event.preventDefault()
    pendingResult.value = null
    isStale.value = false
    await nextTick()
    if (result) {
      emit('completed', result)
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
