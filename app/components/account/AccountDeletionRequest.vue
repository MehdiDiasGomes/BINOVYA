<template>
  <section
    aria-labelledby="account-deletion-title"
    class="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6"
  >
    <p class="sr-only" role="status">
      {{ step === 'submitting' ? $t('account.deletion.submitting') : '' }}
    </p>
    <h2 id="account-deletion-title" class="text-lg font-black text-ink">
      {{ $t('account.deletion.title') }}
    </h2>

    <Motion
      v-if="requestedAt"
      :initial="{ opacity: 0, y: STEP_OFFSET }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="STEP_TRANSITION"
      class="mt-3"
    >
      <div class="rounded-xl bg-green-50 p-4">
        <p
          ref="doneRef"
          tabindex="-1"
          aria-describedby="account-deletion-done-text"
          class="flex items-center gap-2 font-bold text-green-700 outline-none"
        >
          <Icon name="CircleCheck" :size="18" aria-hidden="true" class="shrink-0" />
          {{ $t('account.deletion.doneTitle') }}
        </p>
        <p id="account-deletion-done-text" class="mt-1.5 text-sm leading-relaxed text-ink/80">
          {{ $t('account.deletion.doneText', { date: requestedDateLabel }) }}
        </p>
      </div>
    </Motion>

    <div v-else-if="step === 'idle'" class="mt-2">
      <p class="text-sm leading-relaxed text-ink/80">{{ $t('account.deletion.text') }}</p>
      <AppButton
        ref="requestButtonRef"
        variant="destructive"
        size="sm"
        icon="Trash2"
        class="mt-4"
        @click="askConfirmation"
      >
        {{ $t('account.deletion.request') }}
      </AppButton>
    </div>

    <Motion
      v-else
      role="group"
      aria-labelledby="account-deletion-confirm-title"
      :initial="{ opacity: 0, y: STEP_OFFSET }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="STEP_TRANSITION"
      class="mt-3 rounded-xl border border-destructive/40 bg-red-50 p-4"
    >
      <h3
        id="account-deletion-confirm-title"
        ref="confirmTitleRef"
        tabindex="-1"
        class="text-base font-black text-ink outline-none"
      >
        {{ $t('account.deletion.confirmTitle') }}
      </h3>
      <p class="mt-1.5 text-sm leading-relaxed text-ink/80">
        {{ $t('account.deletion.confirmText') }}
      </p>
      <p v-if="hasFailed" role="alert" :class="cn(ERROR_MESSAGE_CLASS, 'mt-3')">
        <Icon name="CircleAlert" :size="16" aria-hidden="true" />
        {{ $t('account.deletion.error') }}
      </p>
      <div class="mt-4 flex flex-col gap-3 sm:flex-row">
        <AppButton
          variant="destructiveSolid"
          size="sm"
          icon="Trash2"
          :is-loading="step === 'submitting'"
          :aria-busy="step === 'submitting'"
          @click="confirmDeletion"
        >
          {{
            step === 'submitting'
              ? $t('account.deletion.submitting')
              : $t('account.deletion.confirm')
          }}
        </AppButton>
        <AppButton variant="secondary" size="sm" @click="cancelConfirmation">
          {{ $t('account.deletion.cancel') }}
        </AppButton>
      </div>
    </Motion>
  </section>
</template>

<script setup lang="ts">
import { FetchError } from 'ofetch'

import type { DeletionRequestResponse, DeletionStep } from '@/types/account'
import type { FocusTarget } from '@/types/button'

import { ERROR_MESSAGE_CLASS } from '@/constants/feedback'
import { STEP_OFFSET, STEP_TRANSITION } from '@/constants/motion'
import { cn } from '@/lib/utils'
import { formatFullDate, toIsoDate } from '@/utils/date'

const props = withDefaults(
  defineProps<{
    initialRequestedAt?: string | null
  }>(),
  {
    initialRequestedAt: null,
  },
)

const { locale } = useI18n()
const { expireSession } = useCustomerSession()

const requestedAt: Ref<string | null> = ref(props.initialRequestedAt)
const step: Ref<DeletionStep> = ref('idle')
const hasFailed: Ref<boolean> = ref(false)
const doneRef: Ref<HTMLElement | null> = ref(null)
const requestButtonRef: Ref<FocusTarget | null> = ref(null)
const confirmTitleRef: Ref<HTMLElement | null> = ref(null)

const requestedDateLabel: ComputedRef<string> = computed(() =>
  requestedAt.value ? formatFullDate(toIsoDate(new Date(requestedAt.value)), locale.value) : '',
)

const askConfirmation = async (): Promise<void> => {
  step.value = 'confirming'
  hasFailed.value = false
  await nextTick()
  confirmTitleRef.value?.focus()
}

const cancelConfirmation = async (): Promise<void> => {
  step.value = 'idle'
  await nextTick()
  requestButtonRef.value?.focus()
}

const confirmDeletion = async (): Promise<void> => {
  if (step.value === 'submitting') {
    return
  }
  step.value = 'submitting'
  hasFailed.value = false
  try {
    const response: DeletionRequestResponse = await $fetch<DeletionRequestResponse>(
      '/api/account/deletion-request',
      { method: 'POST' },
    )
    requestedAt.value = response.requestedAt
    step.value = 'done'
    await nextTick()
    doneRef.value?.focus()
  } catch (error) {
    if (error instanceof FetchError && error.statusCode === 401) {
      await expireSession()
      return
    }
    step.value = 'confirming'
    hasFailed.value = true
  }
}
</script>
