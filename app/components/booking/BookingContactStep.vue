<template>
  <div class="space-y-5">
    <div class="grid gap-5 sm:grid-cols-2">
      <BookingField
        id="booking-first-name"
        v-model="draft.contact.firstName"
        :label="$t('booking.contact.firstName')"
        :placeholder="$t('booking.contact.firstNamePlaceholder')"
        :error="errorFor('firstName')"
        autocomplete="given-name"
      />
      <BookingField
        id="booking-last-name"
        v-model="draft.contact.lastName"
        :label="$t('booking.contact.lastName')"
        :placeholder="$t('booking.contact.lastNamePlaceholder')"
        :error="errorFor('lastName')"
        autocomplete="family-name"
      />
    </div>
    <BookingField
      id="booking-email"
      v-model="draft.contact.email"
      type="email"
      :label="$t('booking.contact.email')"
      :placeholder="$t('booking.contact.emailPlaceholder')"
      :hint="$t('booking.contact.emailHint')"
      :error="errorFor('email')"
      autocomplete="email"
    />
    <BookingField
      id="booking-phone"
      v-model="draft.contact.phone"
      type="tel"
      :label="$t('booking.contact.phone')"
      :placeholder="$t('booking.contact.phonePlaceholder')"
      :hint="$t('booking.contact.phoneHint')"
      :error="errorFor('phone')"
      autocomplete="tel"
    />

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
          class="mt-0.5 h-5 w-5 shrink-0 rounded border-ink/40 accent-primary"
        />
        {{ $t('booking.contact.terms') }}
      </label>
      <NuxtLink
        :to="localePath('/privacy')"
        target="_blank"
        class="ml-8 mt-1 inline-block text-[13px] font-bold text-ink underline underline-offset-4 hover:text-primary"
      >
        {{ $t('booking.contact.termsLink') }}
      </NuxtLink>
    </div>

    <p
      class="flex items-start gap-2.5 rounded-xl bg-paper-2 p-4 text-[13px] font-semibold text-ink"
    >
      <Icon name="Lock" :size="16" aria-hidden="true" class="mt-0.5 shrink-0 text-primary" />
      {{ $t('booking.contact.securePayment') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { BookingContact, ContactErrors } from '@/types/booking'

const props = withDefaults(
  defineProps<{
    showErrors?: boolean
  }>(),
  {
    showErrors: false,
  },
)

const { t } = useI18n()
const localePath = useLocalePath()
const { draft } = useBookingDraft()

const errors: ComputedRef<ContactErrors> = computed(() => validateContact(draft.value.contact))

const errorFor = (field: keyof BookingContact): string => {
  const key: string | undefined = errors.value[field]
  return props.showErrors && key ? t(key) : ''
}
</script>
