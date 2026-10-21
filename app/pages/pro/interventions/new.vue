<template>
  <div class="min-h-[70vh]">
    <p class="sr-only" role="status" aria-live="polite">{{ liveStatus }}</p>
    <div class="mx-auto max-w-[720px] space-y-8 px-4 pb-16 pt-8 sm:px-8 sm:pt-12">
      <div :class="HERO_ENTER_CLASS">
        <span class="mb-2 block text-[12.5px] font-black uppercase tracking-[1.5px] text-primary">
          {{ $t('pro.create.eyebrow') }}
        </span>
        <h1 class="text-[28px] font-black leading-tight text-ink sm:text-[32px]">
          {{ $t('pro.create.title') }}
        </h1>
        <p class="mt-2 text-[15px] text-ink/80">{{ $t('pro.create.intro') }}</p>
      </div>

      <p v-if="prefillStatus === 'loading'" class="text-[15px] text-ink/80">
        {{ prefillText }}
      </p>
      <p v-else-if="prefillStatus === 'error'" :class="ERROR_MESSAGE_CLASS">
        <Icon name="CircleAlert" :size="16" aria-hidden="true" />
        {{ prefillText }}
      </p>

      <form
        v-if="prefillStatus !== 'loading'"
        class="space-y-6"
        novalidate
        @submit.prevent="submit(false)"
      >
        <section
          v-for="section in PRO_CREATE_SECTIONS"
          :key="section"
          :aria-labelledby="`${PRO_CREATE_ID_PREFIX}-${section}-title`"
          class="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6"
        >
          <h2
            :id="`${PRO_CREATE_ID_PREFIX}-${section}-title`"
            class="mb-4 text-lg font-black text-ink"
          >
            {{ $t(`pro.create.sections.${section}`) }}
          </h2>
          <BookingContactFields
            v-if="section === 'customer'"
            v-model="draft.contact"
            :id-prefix="PRO_CREATE_ID_PREFIX"
            :show-errors="hasAttempted"
            :email-hint="$t('pro.create.customer.emailHint')"
            :autocomplete="false"
          />
          <BookingAddressSearch
            v-else-if="section === 'address'"
            :id="PRO_CREATE_FIELD_IDS.address"
            :model-value="draft.address"
            :error="errorText('address')"
            @update:model-value="changeAddress"
          />
          <ProCreateBinsFields
            v-else-if="section === 'bins'"
            v-model="draft"
            :bins-error="errorText('bins')"
            :quote-amount-error="errorText('quoteAmount')"
            :price-for="priceFor"
            :has-grid-error="hasGridError"
          />
          <DatePicker
            v-else-if="section === 'date'"
            :id="PRO_CREATE_FIELD_IDS.date"
            :model-value="draft.date"
            :label="$t('pro.create.date.label')"
            :min="today"
            :max="maxDate"
            :error="errorText('date')"
            :described-by="refusal ? REFUSAL_ID : undefined"
            :marked-days="markedDays"
            @update:model-value="draft.date = $event"
            @visible-range="loadDays"
          />
          <ProCreatePaymentFields
            v-else
            v-model="draft"
            :price-cents="priceCents"
            :note-error="errorText('note')"
          />
        </section>

        <div
          v-if="refusal"
          class="space-y-3 rounded-xl border border-destructive/50 bg-destructive/5 p-4"
        >
          <p :id="REFUSAL_ID" role="alert" :class="INLINE_ERROR_CLASS">
            <Icon name="CircleAlert" :size="16" aria-hidden="true" class="mt-0.5 shrink-0" />
            {{ refusal }}
          </p>
          <AnimatePresence :initial="false">
            <Motion
              v-if="isForceable"
              key="force"
              as="div"
              :initial="{ opacity: 0, y: -FEEDBACK_OFFSET }"
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
                {{ $t('pro.create.force') }}
              </AppButton>
            </Motion>
          </AnimatePresence>
        </div>

        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <AppButton :to="localePath(PRO_HOME_PATH)" variant="secondary">
            {{ $t('pro.create.cancel') }}
          </AppButton>
          <AppButton ref="submitButtonRef" type="submit" :is-loading="isSubmitting">
            {{ isSubmitting ? $t('pro.create.submitting') : $t(`pro.create.submit.${draft.mode}`) }}
          </AppButton>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  ProCreateFormState,
  ProCreatePrefillState,
  ProCreateSubmitState,
} from '@/types/proCreateForm'

import { ERROR_MESSAGE_CLASS, INLINE_ERROR_CLASS } from '@/constants/feedback'
import { FEEDBACK_OFFSET, HERO_ENTER_CLASS, STEP_TRANSITION } from '@/constants/motion'
import { PRO_AVAILABILITY_HORIZON_DAYS, PRO_HOME_PATH } from '@/constants/pro'
import {
  PRO_CREATE_FIELD_IDS,
  PRO_CREATE_ID_PREFIX,
  PRO_CREATE_SECTIONS,
} from '@/constants/proCreate'
import { addDaysToIsoDate } from '@/utils/date'

definePageMeta({
  layout: 'pro',
  middleware: ['admin'],
})

const REFUSAL_ID: string = `${PRO_CREATE_ID_PREFIX}-refusal`

const { t } = useI18n()
const localePath = useLocalePath()
const today: Readonly<Ref<string>> = useBusinessToday()

const form: ProCreateFormState = useProCreateForm()
const { draft, hasAttempted, errorText, priceFor, priceCents, hasGridError, changeAddress } = form
const { refusal, isForceable, isSubmitting, submitButtonRef, submit }: ProCreateSubmitState =
  useProCreateSubmit(form)

const { status: prefillStatus, statusText: prefillText }: ProCreatePrefillState =
  useProCreatePrefill(form)
const { markedDays, loadDays } = useProInterventionDays()

const liveStatus: ComputedRef<string> = computed(() =>
  isSubmitting.value ? t('pro.create.submittingStatus') : prefillText.value,
)

const maxDate: ComputedRef<string> = computed(() =>
  addDaysToIsoDate(today.value, PRO_AVAILABILITY_HORIZON_DAYS),
)

useSeoMeta({
  title: () => t('pro.create.seo.title'),
  robots: 'noindex, nofollow',
})
</script>
