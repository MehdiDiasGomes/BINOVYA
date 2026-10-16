<template>
  <div class="bg-paper">
    <p class="sr-only" role="status">
      {{ isSubmitting ? $t('booking.actions.submittingStatus') : '' }}
    </p>
    <section class="bg-navy-950 pb-10 pt-12">
      <div class="mx-auto max-w-[1180px] px-4 sm:px-8">
        <span
          :class="HERO_ENTER_CLASS"
          class="mb-2.5 block text-[12.5px] font-black uppercase tracking-[1.5px] text-turquoise"
        >
          {{ $t('booking.header.eyebrow') }}
        </span>
        <h1
          :class="HERO_ENTER_CLASS"
          class="delay-75 text-[32px] font-black leading-tight text-white"
        >
          {{ $t('booking.header.title') }}
        </h1>
        <p
          :class="HERO_ENTER_CLASS"
          class="delay-150 mt-2 max-w-[560px] text-[15px] leading-relaxed text-[#c4d6e2]"
        >
          {{ $t('booking.header.subtitle') }}
        </p>
        <BookingStepper
          v-if="!isConfirmed"
          :steps="BOOKING_STEPS"
          :current="currentStep"
          :class="HERO_ENTER_CLASS"
          class="delay-200 mt-8 max-w-3xl"
        />
      </div>
    </section>

    <div class="mx-auto max-w-[1180px] px-4 py-10 sm:px-8">
      <AnimatePresence :initial="false">
        <Motion
          v-if="isConfirmed"
          key="confirmed"
          :initial="{ opacity: 0, y: STEP_OFFSET }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="STEP_TRANSITION"
        >
          <BookingConfirmation @restart="restart" />
        </Motion>

        <Motion
          v-else
          key="booking"
          :initial="{ opacity: 0 }"
          :animate="{ opacity: 1 }"
          :transition="STEP_TRANSITION"
          class="grid gap-8 lg:grid-cols-[1fr_340px]"
        >
          <form
            novalidate
            aria-labelledby="booking-step-title"
            :class="HERO_ENTER_CLASS"
            class="delay-200 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-8"
            @submit.prevent="goNext"
          >
            <h2
              id="booking-step-title"
              ref="stepTitleRef"
              tabindex="-1"
              class="text-[22px] font-black text-ink outline-none"
            >
              {{ $t(`booking.headings.${currentStep}.title`) }}
            </h2>
            <p class="mb-7 mt-1.5 text-[15px] leading-relaxed text-ink/70">
              {{ $t(`booking.headings.${currentStep}.description`) }}
              <NuxtLink
                v-if="currentStep === 'contact'"
                :to="localePath('/privacy')"
                class="rounded-sm font-bold text-ink underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {{ $t('booking.headings.contact.privacyLink') }}
              </NuxtLink>
            </p>

            <AnimatePresence mode="wait" :initial="false">
              <Motion
                :key="currentStep"
                :initial="{ opacity: 0, x: STEP_OFFSET }"
                :animate="{ opacity: 1, x: 0 }"
                :exit="{ opacity: 0, x: -STEP_OFFSET }"
                :transition="STEP_TRANSITION"
              >
                <div v-if="currentStep === 'contact'" class="space-y-8">
                  <BookingContactStep :show-errors="hasAttempted" />
                  <Separator />
                  <BookingAddressStep />
                </div>
                <BookingBinsStep v-else-if="currentStep === 'bins'" />
                <div v-else-if="currentStep === 'schedule'" class="space-y-8">
                  <BookingPlanPicker />
                  <Separator />
                  <BookingDateStep />
                </div>
                <BookingPaymentStep v-else />
              </Motion>
            </AnimatePresence>
            <HoneypotField id="booking-website" v-model="website" />

            <p
              v-if="visibleErrorKey"
              role="alert"
              class="mt-6 flex items-start gap-2 text-sm font-bold leading-relaxed text-destructive"
            >
              <Icon name="CircleAlert" :size="16" aria-hidden="true" class="mt-0.5 shrink-0" />
              {{ $t(visibleErrorKey) }}
            </p>

            <div
              class="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between"
            >
              <button
                v-if="currentIndex > 0"
                type="button"
                class="flex h-12 items-center justify-center gap-2 rounded-lg border border-ink/50 px-5 text-sm font-bold text-ink transition-all duration-150 hover:border-primary hover:bg-paper-2 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:active:scale-100"
                @click="goBack"
              >
                <Icon name="ArrowLeft" :size="16" aria-hidden="true" />
                {{ $t('booking.actions.back') }}
              </button>
              <span v-else />
              <button
                type="submit"
                :aria-disabled="isSubmitting"
                :aria-busy="isSubmitting"
                class="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-bold text-white shadow-md shadow-primary/30 transition-all duration-150 hover:-translate-y-px hover:bg-navy-800 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-disabled:hover:translate-y-0 aria-disabled:active:scale-100 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
              >
                <template v-if="isSubmitting">
                  <Icon name="Loader2" :size="16" aria-hidden="true" class="animate-spin" />
                  {{ $t('booking.actions.submitting') }}
                </template>
                <template v-else-if="isLastStep">
                  {{ $t('booking.actions.pay', { amount: formatPrice(priceCents ?? 0, locale) }) }}
                </template>
                <template v-else>
                  {{ $t('booking.actions.continue') }}
                  <Icon name="ArrowRight" :size="16" aria-hidden="true" />
                </template>
              </button>
            </div>
          </form>

          <BookingSummary :class="HERO_ENTER_CLASS" class="delay-300" />
        </Motion>
      </AnimatePresence>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  BookingCheckoutState,
  BookingErrorCode,
  BookingRequest,
  BookingResponse,
  BookingService,
  BookingStepId,
} from '@/types/booking'

import { BOOKING_SERVICES, BOOKING_STEPS, BOOKING_SUBMIT_ERROR_KEYS } from '@/constants/booking'
import { HERO_ENTER_CLASS, STEP_OFFSET, STEP_TRANSITION } from '@/constants/motion'

definePageMeta({
  layout: 'default',
})

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { draft, totalQuantity, resetDraft } = useBookingDraft()
const { reset: resetAvailability } = useBookingAvailability()
const { priceCents } = useBookingPrice()
const { errorFor } = useBookingValidation()
const checkout: BookingCheckoutState = useBookingCheckout()
const { rememberCheckout, readOutcome, waitForRelease, readErrorCode } = checkout

useSeoMeta({
  title: () => t('booking.seo.title'),
  description: () => t('booking.seo.description'),
  ogTitle: () => t('booking.seo.title'),
  ogDescription: () => t('booking.seo.description'),
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

const currentStep: Ref<BookingStepId> = ref('contact')
const hasAttempted: Ref<boolean> = ref(false)
const isConfirmed: Ref<boolean> = ref(false)
const isSubmitting: Ref<boolean> = ref(false)
const submitErrorKey: Ref<string | null> = ref(null)
const website: Ref<string> = ref('')
const stepTitleRef: Ref<HTMLElement | null> = ref(null)

const currentIndex: ComputedRef<number> = computed(() => BOOKING_STEPS.indexOf(currentStep.value))
const isLastStep: ComputedRef<boolean> = computed(
  () => currentIndex.value === BOOKING_STEPS.length - 1,
)

const stepErrorKey: ComputedRef<string | null> = computed(() => errorFor(currentStep.value))

const visibleErrorKey: ComputedRef<string | null> = computed(
  () => submitErrorKey.value ?? (hasAttempted.value ? stepErrorKey.value : null),
)

const showStep = async (step: BookingStepId): Promise<void> => {
  currentStep.value = step
  hasAttempted.value = false
  await nextTick()
  stepTitleRef.value?.focus()
  stepTitleRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const buildRequest = (): BookingRequest | null => {
  const { address, date, contact, plan, quantities, collection } = draft.value
  if (!address || !date) {
    return null
  }
  return {
    address,
    date,
    contact: { ...contact, phone: toInternationalPhone(contact.phone, contact.phoneCountryCode) },
    plan,
    smallBinCount: quantities['small-bin'],
    largeBinCount: quantities['large-bin'],
    householdCollectionWeekdays: collection.household.weekdays,
    recyclingCollectionWeekdays: collection.recycling.weekdays,
    binsReadyConfirmed: draft.value.hasConfirmedBinsReady,
    locale: locale.value,
    website: website.value,
  }
}

const handleSubmitError = async (error: unknown): Promise<void> => {
  const code: BookingErrorCode | null = readErrorCode(error)
  if (code === 'dayTaken') {
    draft.value.date = null
    await showStep('schedule')
  }
  submitErrorKey.value = code ? BOOKING_SUBMIT_ERROR_KEYS[code] : 'booking.errors.submit'
}

const submitBooking = async (): Promise<void> => {
  const request: BookingRequest | null = buildRequest()
  if (!request) {
    return
  }
  isSubmitting.value = true
  try {
    await waitForRelease()
    const response: BookingResponse = await $fetch<BookingResponse>('/api/booking', {
      method: 'POST',
      body: request,
    })
    rememberCheckout(response.bookingId, draft.value)
    await navigateTo(response.checkoutUrl, { external: true })
  } catch (error) {
    await handleSubmitError(error)
    isSubmitting.value = false
  }
}

const goNext = async (): Promise<void> => {
  if (isSubmitting.value) {
    return
  }
  hasAttempted.value = true
  submitErrorKey.value = null
  if (stepErrorKey.value) {
    return
  }
  const nextStep: BookingStepId | undefined = BOOKING_STEPS[currentIndex.value + 1]
  if (nextStep) {
    await showStep(nextStep)
    return
  }
  await submitBooking()
}

const goBack = async (): Promise<void> => {
  const previousStep: BookingStepId | undefined = BOOKING_STEPS[currentIndex.value - 1]
  if (previousStep) {
    await showStep(previousStep)
  }
}

const restart = async (): Promise<void> => {
  resetDraft()
  resetAvailability()
  isConfirmed.value = false
  await showStep('contact')
}

const preselectService = (): void => {
  const requested: BookingService | undefined = BOOKING_SERVICES.find(
    service => service.slug === route.query.service,
  )
  if (requested && totalQuantity.value === 0) {
    draft.value.quantities[requested.slug] = 1
  }
}

if (!readOutcome()) {
  preselectService()
}

useBookingCheckoutReturn({
  checkout,
  isSubmitting,
  isConfirmed,
  submitErrorKey,
  showStep,
})
</script>
