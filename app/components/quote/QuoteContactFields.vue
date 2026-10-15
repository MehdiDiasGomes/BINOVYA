<template>
  <fieldset>
    <legend class="text-lg font-black text-ink">{{ $t('quote.sections.contact') }}</legend>
    <div class="mt-4 space-y-5">
      <div class="grid gap-5 sm:grid-cols-2">
        <BookingField
          id="quote-first-name"
          v-model="contact.firstName"
          :label="$t('booking.contact.firstName')"
          :placeholder="$t('booking.contact.firstNamePlaceholder')"
          :error="errorFor('firstName')"
          autocomplete="given-name"
        />
        <BookingField
          id="quote-last-name"
          v-model="contact.lastName"
          :label="$t('booking.contact.lastName')"
          :placeholder="$t('booking.contact.lastNamePlaceholder')"
          :error="errorFor('lastName')"
          autocomplete="family-name"
        />
      </div>
      <BookingField
        id="quote-company"
        v-model="contact.company"
        :label="$t('quote.fields.company')"
        :placeholder="$t('quote.fields.companyPlaceholder')"
        :error="companyError"
        :is-required="false"
        autocomplete="organization"
      />
      <div class="grid items-start gap-5 lg:grid-cols-2">
        <BookingField
          id="quote-email"
          v-model="contact.email"
          type="email"
          :label="$t('booking.contact.email')"
          :placeholder="$t('booking.contact.emailPlaceholder')"
          :error="errorFor('email')"
          autocomplete="email"
        />
        <BookingPhoneField
          id="quote-phone"
          v-model="contact.phone"
          v-model:country-code="contact.phoneCountryCode"
          :label="$t('booking.contact.phone')"
          :country-label="$t('booking.contact.phoneCountry')"
          :placeholder="$t(`booking.contact.phonePlaceholder.${contact.phoneCountryCode}`)"
          :error="errorFor('phone')"
        />
      </div>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import type { BookingContact } from '@/types/booking'
import type { QuoteContact } from '@/types/quote'

import { COMPANY_MAX_LENGTH, CONTACT_NAME_LIMITS } from '@/constants/booking'

const props = withDefaults(
  defineProps<{
    showErrors?: boolean
  }>(),
  {
    showErrors: false,
  },
)

const contact = defineModel<QuoteContact>({ required: true })

const { t } = useI18n()

const companyError: ComputedRef<string> = computed(() =>
  props.showErrors && !isValidQuoteCompany(contact.value.company)
    ? t('quote.errors.company', { max: COMPANY_MAX_LENGTH })
    : '',
)

const errorFor = (field: keyof BookingContact): string => {
  const key: string | undefined = props.showErrors
    ? validateContact(contact.value)[field]
    : undefined
  return key ? t(key, CONTACT_NAME_LIMITS) : ''
}
</script>
