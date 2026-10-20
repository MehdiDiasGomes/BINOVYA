<template>
  <div class="space-y-5">
    <div class="grid gap-5 sm:grid-cols-2">
      <BookingField
        :id="`${props.idPrefix}-first-name`"
        v-model="contact.firstName"
        :label="$t('booking.contact.firstName')"
        :placeholder="$t('booking.contact.firstNamePlaceholder')"
        :error="errorFor('firstName')"
        :autocomplete="props.autocomplete ? 'given-name' : 'off'"
      />
      <BookingField
        :id="`${props.idPrefix}-last-name`"
        v-model="contact.lastName"
        :label="$t('booking.contact.lastName')"
        :placeholder="$t('booking.contact.lastNamePlaceholder')"
        :error="errorFor('lastName')"
        :autocomplete="props.autocomplete ? 'family-name' : 'off'"
      />
    </div>
    <BookingField
      :id="`${props.idPrefix}-email`"
      v-model="contact.email"
      type="email"
      :label="$t('booking.contact.email')"
      :placeholder="$t('booking.contact.emailPlaceholder')"
      :hint="props.emailHint"
      :error="errorFor('email')"
      :autocomplete="props.autocomplete ? 'email' : 'off'"
    />
    <BookingPhoneField
      :id="`${props.idPrefix}-phone`"
      v-model="contact.phone"
      v-model:country-code="contact.phoneCountryCode"
      :label="$t('booking.contact.phone')"
      :country-label="$t('booking.contact.phoneCountry')"
      :placeholder="$t(`booking.contact.phonePlaceholder.${contact.phoneCountryCode}`)"
      :hint="props.phoneHint"
      :error="errorFor('phone')"
    />
  </div>
</template>

<script setup lang="ts">
import type { BookingContact, ContactErrors } from '@/types/booking'

import { CONTACT_NAME_LIMITS } from '@/constants/booking'

const props = withDefaults(
  defineProps<{
    idPrefix?: string
    showErrors?: boolean
    emailHint?: string
    phoneHint?: string
    autocomplete?: boolean
  }>(),
  {
    idPrefix: 'booking',
    showErrors: false,
    emailHint: '',
    phoneHint: '',
    autocomplete: true,
  },
)

const contact = defineModel<BookingContact>({ required: true })

const { t } = useI18n()

const errors: ComputedRef<ContactErrors> = computed(() => validateContact(contact.value))

const errorFor = (field: keyof BookingContact): string => {
  const key: string | undefined = errors.value[field]
  return props.showErrors && key ? t(key, CONTACT_NAME_LIMITS) : ''
}
</script>
