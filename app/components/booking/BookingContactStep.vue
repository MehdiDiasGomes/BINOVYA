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
    <BookingPhoneField
      id="booking-phone"
      v-model="draft.contact.phone"
      v-model:country-code="draft.contact.phoneCountryCode"
      :label="$t('booking.contact.phone')"
      :country-label="$t('booking.contact.phoneCountry')"
      :placeholder="$t(`booking.contact.phonePlaceholder.${draft.contact.phoneCountryCode}`)"
      :hint="$t('booking.contact.phoneHint')"
      :error="errorFor('phone')"
    />
  </div>
</template>

<script setup lang="ts">
import type { BookingContact, ContactErrors } from '@/types/booking'

import { CONTACT_NAME_LIMITS } from '@/constants/booking'

const props = withDefaults(
  defineProps<{
    showErrors?: boolean
  }>(),
  {
    showErrors: false,
  },
)

const { t } = useI18n()
const { draft } = useBookingDraft()

const errors: ComputedRef<ContactErrors> = computed(() => validateContact(draft.value.contact))

const errorFor = (field: keyof BookingContact): string => {
  const key: string | undefined = errors.value[field]
  return props.showErrors && key ? t(key, CONTACT_NAME_LIMITS) : ''
}
</script>
