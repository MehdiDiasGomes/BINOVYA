<template>
  <div class="mt-4 space-y-3">
    <p class="sr-only" role="status" aria-live="polite">{{ notice }}</p>
    <p class="text-[15px] text-ink/80">{{ deadlineText }}</p>
    <AppButton
      variant="secondary"
      icon="Send"
      :is-loading="isSending"
      class="w-full sm:w-auto"
      @click="resend"
    >
      {{ isSending ? $t('pro.paymentLink.resending') : $t('pro.paymentLink.resend') }}
    </AppButton>
    <ProFormFeedback :message="feedback.message" :is-error="feedback.isError" />
  </div>
</template>

<script setup lang="ts">
import type { ProIntervention } from '@/types/pro'
import type { ProPaymentLinkResponse } from '@/types/proCreate'
import type { ProPaymentLinkFeedback } from '@/types/proCreateForm'

import {
  PRO_PAYMENT_LINK_MAX_RESENDS,
  PRO_PAYMENT_LINK_OUTDATED_CODES,
  PRO_PAYMENT_LINK_TIMEOUT_MS,
} from '@/constants/proCreate'
import { formatBusinessDateTime } from '@/utils/date'
import { isFetchTimeoutError, readFetchErrorCode } from '@/utils/fetchError'
import { isProPaymentLinkErrorCode } from '@/utils/proCreate'

const props = defineProps<{
  intervention: ProIntervention
}>()

const emit = defineEmits<{
  outdated: [notice: string]
}>()

const NO_FEEDBACK: ProPaymentLinkFeedback = { message: '', isError: false }

const { t, locale } = useI18n()
const { handleAuthError } = useProAuthError()
const { message: notice, announce } = useLiveAnnouncement()

const isSending: Ref<boolean> = ref(false)
const feedback: Ref<ProPaymentLinkFeedback> = ref(NO_FEEDBACK)

const deadlineText: ComputedRef<string> = computed(() =>
  props.intervention.paymentDueAt
    ? t('pro.paymentLink.text', {
        deadline: formatBusinessDateTime(props.intervention.paymentDueAt, locale.value),
      })
    : t('pro.paymentLink.textNoDeadline'),
)

const errorText = (error: unknown, code: unknown): string => {
  if (isFetchTimeoutError(error)) {
    return t('pro.paymentLink.errors.timeout')
  }
  return isProPaymentLinkErrorCode(code)
    ? t(`pro.paymentLink.errors.${code}`, { max: PRO_PAYMENT_LINK_MAX_RESENDS })
    : t('pro.paymentLink.errors.generic')
}

const showFeedback = async (next: ProPaymentLinkFeedback): Promise<void> => {
  feedback.value = next
  await announce(next.message)
}

const handleError = async (error: unknown): Promise<void> => {
  if (await handleAuthError(error)) {
    return
  }
  const code: unknown = readFetchErrorCode(error)
  const message: string = errorText(error, code)
  if (isProPaymentLinkErrorCode(code) && PRO_PAYMENT_LINK_OUTDATED_CODES.includes(code)) {
    emit('outdated', message)
    return
  }
  await showFeedback({ message, isError: true })
}

const resend = async (): Promise<void> => {
  if (isSending.value) {
    return
  }
  isSending.value = true
  feedback.value = NO_FEEDBACK
  try {
    await $fetch<ProPaymentLinkResponse>(
      `/api/pro/bookings/${encodeURIComponent(props.intervention.id)}/payment-link`,
      { method: 'POST', timeout: PRO_PAYMENT_LINK_TIMEOUT_MS },
    )
    await showFeedback({ message: t('pro.paymentLink.sent'), isError: false })
  } catch (error: unknown) {
    await handleError(error)
  } finally {
    isSending.value = false
  }
}
</script>
