<template>
  <div class="bg-paper">
    <section class="bg-navy-950 pb-10 pt-12">
      <div class="mx-auto max-w-[1180px] px-4 sm:px-8">
        <span
          :class="HERO_ENTER_CLASS"
          class="mb-2.5 block text-[12.5px] font-black uppercase tracking-[1.5px] text-turquoise"
        >
          {{ $t('quote.header.eyebrow') }}
        </span>
        <h1
          :class="HERO_ENTER_CLASS"
          class="delay-75 text-[32px] font-black leading-tight text-white"
        >
          {{ $t('quote.header.title') }}
        </h1>
        <p
          :class="HERO_ENTER_CLASS"
          class="delay-150 mt-2 max-w-[560px] text-[15px] leading-relaxed text-[#c4d6e2]"
        >
          {{ $t('quote.header.subtitle') }}
        </p>
      </div>
    </section>

    <div
      class="mx-auto grid max-w-[1180px] items-start gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
    >
      <div :class="HERO_ENTER_CLASS" class="min-w-0 delay-200">
        <AnimatePresence mode="wait" :initial="false">
          <Motion
            v-if="isSent"
            key="sent"
            :initial="{ opacity: 0, y: STEP_OFFSET }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="{ opacity: 0 }"
            :transition="STEP_TRANSITION"
          >
            <FormSent :title="$t('quote.sent.title')" :text="$t('quote.sent.text')" />
          </Motion>

          <Motion
            v-else
            key="form"
            :initial="{ opacity: 0, y: STEP_OFFSET }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="{ opacity: 0 }"
            :transition="STEP_TRANSITION"
          >
            <form
              novalidate
              :aria-label="$t('quote.header.title')"
              class="space-y-8 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-8"
              @submit.prevent="handleSubmit"
            >
              <QuoteContactFields v-model="form.contact" :show-errors="hasAttempted" />

              <Separator />

              <section aria-labelledby="quote-address-title">
                <h2 id="quote-address-title" class="mb-4 text-lg font-black text-ink">
                  {{ $t('quote.sections.address') }}
                </h2>
                <BookingAddressSearch
                  :id="QUOTE_ADDRESS_INPUT_ID"
                  v-model="form.address"
                  :error="addressError"
                />
              </section>

              <Separator />

              <QuoteEquipmentField
                id="quote-equipment"
                v-model="form.equipment"
                :error="visibleError('equipment')"
              />

              <AnimatePresence :initial="false">
                <Motion
                  v-if="hasBins"
                  key="bins"
                  :initial="{ opacity: 0, y: -STEP_OFFSET / 2 }"
                  :animate="{ opacity: 1, y: 0 }"
                  :exit="{ opacity: 0, y: -STEP_OFFSET / 2 }"
                  :transition="STEP_TRANSITION"
                  class="space-y-8"
                >
                  <Separator />
                  <QuoteBinsField
                    id="quote-bins"
                    v-model:small-bin-count="form.smallBinCount"
                    v-model:large-bin-count="form.largeBinCount"
                    :error="visibleError('bins')"
                  />
                </Motion>
              </AnimatePresence>

              <Separator />

              <QuotePlanField v-model="form.plan" />

              <Separator />

              <label for="quote-comment" class="block">
                <span class="block text-lg font-black text-ink">
                  {{ $t('quote.comment.label') }}
                </span>
                <textarea
                  id="quote-comment"
                  v-model="form.comment"
                  rows="5"
                  :maxlength="QUOTE_COMMENT_MAX_LENGTH"
                  :placeholder="$t('quote.comment.placeholder')"
                  :class="cn(FIELD_TEXTAREA_CLASS, 'mt-4')"
                />
              </label>

              <Separator />

              <QuotePhotoPicker v-model="photos" />

              <HoneypotField id="quote-website" v-model="form.website" />

              <Separator />

              <div class="space-y-4">
                <p
                  v-if="hasFailed"
                  role="alert"
                  class="flex items-center gap-2 text-sm font-bold text-destructive"
                >
                  <Icon name="CircleAlert" :size="16" aria-hidden="true" />
                  {{ $t('quote.errors.submit') }}
                </p>
                <button
                  type="submit"
                  :aria-disabled="isSubmitting"
                  :aria-busy="isSubmitting"
                  class="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-bold text-white shadow-md shadow-primary/30 transition-all duration-press ease-brand hover:-translate-y-px hover:bg-navy-800 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 sm:w-auto"
                >
                  <template v-if="isSubmitting">
                    <Icon name="Loader2" :size="16" aria-hidden="true" class="animate-spin" />
                    {{ $t('quote.actions.submitting') }}
                  </template>
                  <template v-else>
                    <Icon name="Send" :size="16" aria-hidden="true" />
                    {{ $t('quote.actions.submit') }}
                  </template>
                </button>
              </div>
            </form>
          </Motion>
        </AnimatePresence>
      </div>

      <QuoteAside :class="HERO_ENTER_CLASS" class="delay-300 lg:sticky lg:top-24" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BookingContact, ContactErrors } from '@/types/booking'
import type { QuoteField } from '@/types/quote'

import { FIELD_TEXTAREA_CLASS } from '@/constants/booking'
import { HERO_ENTER_CLASS, STEP_OFFSET, STEP_TRANSITION } from '@/constants/motion'
import { QUOTE_ADDRESS_INPUT_ID, QUOTE_COMMENT_MAX_LENGTH } from '@/constants/quote'
import { cn } from '@/lib/utils'
import { focusFirstElement } from '@/utils/focus'

type ContactFieldId = [keyof BookingContact | 'company', string]

const NAME_FIELD_IDS: ContactFieldId[] = [
  ['firstName', 'quote-first-name'],
  ['lastName', 'quote-last-name'],
]

const COMPANY_FIELD_ID: ContactFieldId = ['company', 'quote-company']

const REACH_FIELD_IDS: ContactFieldId[] = [
  ['email', 'quote-email'],
  ['phone', 'quote-phone'],
]

const SECTION_FIELD_IDS: Record<Exclude<QuoteField, 'contact'>, string> = {
  address: QUOTE_ADDRESS_INPUT_ID,
  equipment: 'quote-equipment',
  bins: 'quote-bins',
}

const { t } = useI18n()
const {
  form,
  photos,
  errors,
  hasAttempted,
  isSubmitting,
  isSent,
  hasFailed,
  addressErrorKey,
  focusAddress,
  submit,
} = useQuoteForm()

const hasBins: ComputedRef<boolean> = computed(() => form.value.equipment.includes('bins'))

useSeoMeta({
  title: () => t('quote.seo.title'),
  description: () => t('quote.seo.description'),
  ogTitle: () => t('quote.seo.title'),
  ogDescription: () => t('quote.seo.description'),
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

const visibleError = (field: QuoteField): string => {
  const key: string | undefined = hasAttempted.value ? errors.value[field] : undefined
  return key ? t(key) : ''
}

const addressError: ComputedRef<string> = computed(() =>
  addressErrorKey.value ? t(addressErrorKey.value) : visibleError('address'),
)

const invalidFieldIds = (): string[] => {
  const contactErrors: ContactErrors = validateContact(form.value.contact)
  const orderedFields: ContactFieldId[] = [...NAME_FIELD_IDS, COMPANY_FIELD_ID, ...REACH_FIELD_IDS]
  const contactIds: string[] = orderedFields
    .filter(([field]) =>
      field === 'company' ? !isValidQuoteCompany(form.value.contact.company) : contactErrors[field],
    )
    .map(([, id]) => id)
  const sectionIds: string[] = (Object.keys(SECTION_FIELD_IDS) as Exclude<QuoteField, 'contact'>[])
    .filter(field => errors.value[field])
    .map(field => SECTION_FIELD_IDS[field])
  return [...contactIds, ...sectionIds]
}

const handleSubmit = async (): Promise<void> => {
  await submit()
  if (addressErrorKey.value) {
    await focusAddress()
    return
  }
  if (Object.keys(errors.value).length > 0) {
    await nextTick()
    focusFirstElement(invalidFieldIds())
  }
}
</script>
