<template>
  <div class="space-y-5">
    <label
      for="booking-bins-ready"
      class="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 text-sm font-semibold text-ink transition-colors duration-200 has-[:checked]:border-primary motion-reduce:transition-none"
    >
      <input
        id="booking-bins-ready"
        v-model="draft.hasConfirmedBinsReady"
        type="checkbox"
        required
        aria-describedby="booking-bins-ready-hint"
        :class="cn(CHECKBOX_CLASS, 'mt-0.5')"
      />
      <span>
        {{ $t('booking.payment.binsReady') }}
        <span id="booking-bins-ready-hint" class="mt-1 block text-[13px] font-normal text-ink/70">
          {{ $t('booking.payment.binsReadyHint') }}
        </span>
      </span>
    </label>

    <div>
      <label
        for="booking-terms"
        class="flex cursor-pointer items-start gap-3 text-sm font-semibold text-ink"
      >
        <input
          id="booking-terms"
          v-model="draft.hasAcceptedTerms"
          type="checkbox"
          required
          :class="cn(CHECKBOX_CLASS, 'mt-0.5')"
        />
        {{ $t('booking.payment.terms') }}
      </label>
      <NuxtLink
        :to="localePath('/privacy')"
        target="_blank"
        class="ml-8 mt-1 inline-block text-[13px] font-bold text-ink underline underline-offset-4 hover:text-primary"
      >
        {{ $t('booking.payment.termsLink') }}
      </NuxtLink>
    </div>

    <p
      class="flex items-start gap-2.5 rounded-xl bg-paper-2 p-4 text-[13px] font-semibold text-ink"
    >
      <StripeLogo :size="16" class="mt-0.5 shrink-0 text-stripe" />
      {{ $t('booking.payment.securePayment') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { CHECKBOX_CLASS } from '@/constants/form'
import { cn } from '@/lib/utils'

const localePath = useLocalePath()
const { draft } = useBookingDraft()
</script>
