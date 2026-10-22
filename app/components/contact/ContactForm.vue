<template>
  <form
    novalidate
    :aria-label="$t('contact.form.label')"
    class="min-w-0 space-y-5 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-8"
    @submit.prevent="handleSubmit"
  >
    <p class="sr-only" role="status">
      {{ props.isSubmitting ? $t('contact.form.submitting') : '' }}
    </p>
    <div class="grid gap-5 sm:grid-cols-2">
      <BookingField
        id="contact-first-name"
        v-model="form.firstName"
        :label="$t('booking.contact.firstName')"
        :placeholder="$t('booking.contact.firstNamePlaceholder')"
        :error="visibleError('firstName')"
        autocomplete="given-name"
      />
      <BookingField
        id="contact-last-name"
        v-model="form.lastName"
        :label="$t('booking.contact.lastName')"
        :placeholder="$t('booking.contact.lastNamePlaceholder')"
        :error="visibleError('lastName')"
        autocomplete="family-name"
      />
    </div>
    <BookingField
      id="contact-company"
      v-model="form.company"
      :label="$t('contact.form.company')"
      :placeholder="$t('contact.form.companyPlaceholder')"
      :error="visibleError('company')"
      :is-required="false"
      autocomplete="organization"
    />
    <BookingField
      id="contact-email"
      v-model="form.email"
      type="email"
      :label="$t('booking.contact.email')"
      :placeholder="$t('booking.contact.emailPlaceholder')"
      :error="visibleError('email')"
      autocomplete="email"
    />
    <BookingPhoneField
      id="contact-phone"
      v-model="form.phone"
      v-model:country-code="form.phoneCountryCode"
      :label="$t('booking.contact.phone')"
      :country-label="$t('booking.contact.phoneCountry')"
      :placeholder="$t(`booking.contact.phonePlaceholder.${form.phoneCountryCode}`)"
      :error="visibleError('phone')"
    />

    <label for="contact-subject" class="block">
      <span class="mb-1.5 block text-sm font-bold text-ink">{{ $t('contact.form.subject') }}</span>
      <span class="relative block">
        <select
          id="contact-subject"
          v-model="form.subject"
          required
          :aria-invalid="visibleError('subject') ? 'true' : undefined"
          :aria-describedby="visibleError('subject') ? 'contact-subject-error' : undefined"
          :class="cn(FIELD_INPUT_CLASS, 'cursor-pointer appearance-none pr-11')"
        >
          <option value="" disabled>{{ $t('contact.form.subjectPlaceholder') }}</option>
          <option v-for="subject in CONTACT_SUBJECTS" :key="subject" :value="subject">
            {{ $t(`contact.subjects.${subject}`) }}
          </option>
        </select>
        <Icon
          name="ChevronDown"
          :size="18"
          aria-hidden="true"
          class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink/70"
        />
      </span>
      <span v-if="visibleError('subject')" id="contact-subject-error" :class="FIELD_ERROR_CLASS">
        <Icon name="CircleAlert" :size="14" aria-hidden="true" />
        {{ visibleError('subject') }}
      </span>
    </label>

    <label for="contact-message" class="block">
      <span class="mb-1.5 block text-sm font-bold text-ink">{{ $t('contact.form.message') }}</span>
      <textarea
        id="contact-message"
        v-model="form.message"
        rows="6"
        required
        :maxlength="CONTACT_MESSAGE_MAX_LENGTH"
        :placeholder="$t('contact.form.messagePlaceholder')"
        :aria-invalid="visibleError('message') ? 'true' : undefined"
        :aria-describedby="visibleError('message') ? 'contact-message-error' : undefined"
        :class="FIELD_TEXTAREA_CLASS"
      />
      <span v-if="visibleError('message')" id="contact-message-error" :class="FIELD_ERROR_CLASS">
        <Icon name="CircleAlert" :size="14" aria-hidden="true" />
        {{ visibleError('message') }}
      </span>
    </label>

    <HoneypotField id="contact-website" v-model="form.website" />

    <p v-if="props.hasFailed" role="alert" :class="ERROR_MESSAGE_CLASS">
      <Icon name="CircleAlert" :size="16" aria-hidden="true" />
      {{ $t('contact.errors.submit') }}
    </p>
    <AppButton
      type="submit"
      icon="Send"
      :is-loading="props.isSubmitting"
      :aria-busy="props.isSubmitting"
      class="w-full shadow-md shadow-primary/30 sm:w-auto"
    >
      {{ props.isSubmitting ? $t('contact.form.submitting') : $t('contact.form.submit') }}
    </AppButton>
  </form>
</template>

<script setup lang="ts">
import type { ContactField, ContactForm, ContactFormErrors } from '@/types/contact'

import { COMPANY_MAX_LENGTH, CONTACT_NAME_LIMITS } from '@/constants/booking'
import {
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_MESSAGE_MIN_LENGTH,
  CONTACT_SUBJECTS,
} from '@/constants/contact'
import { ERROR_MESSAGE_CLASS } from '@/constants/feedback'
import { FIELD_ERROR_CLASS, FIELD_INPUT_CLASS, FIELD_TEXTAREA_CLASS } from '@/constants/form'
import { cn } from '@/lib/utils'
import { focusFirstElement } from '@/utils/focus'

const props = withDefaults(
  defineProps<{
    errors?: ContactFormErrors
    showErrors?: boolean
    isSubmitting?: boolean
    hasFailed?: boolean
  }>(),
  {
    errors: () => ({}),
    showErrors: false,
    isSubmitting: false,
    hasFailed: false,
  },
)

const emit = defineEmits<{
  submit: []
}>()

const FIELD_IDS: Record<ContactField, string> = {
  firstName: 'contact-first-name',
  lastName: 'contact-last-name',
  company: 'contact-company',
  email: 'contact-email',
  phone: 'contact-phone',
  subject: 'contact-subject',
  message: 'contact-message',
}

const ERROR_PARAMS: Partial<Record<ContactField, Record<string, number>>> = {
  firstName: CONTACT_NAME_LIMITS,
  lastName: CONTACT_NAME_LIMITS,
  company: { max: COMPANY_MAX_LENGTH },
  message: { min: CONTACT_MESSAGE_MIN_LENGTH, max: CONTACT_MESSAGE_MAX_LENGTH },
}

const form = defineModel<ContactForm>({ required: true })

const { t } = useI18n()

const visibleError = (field: ContactField): string => {
  const key: string | undefined = props.showErrors ? props.errors[field] : undefined
  return key ? t(key, ERROR_PARAMS[field] ?? {}) : ''
}

const handleSubmit = async (): Promise<void> => {
  emit('submit')
  await nextTick()
  const invalidIds: string[] = (Object.keys(FIELD_IDS) as ContactField[])
    .filter(field => props.errors[field])
    .map(field => FIELD_IDS[field])
  focusFirstElement(invalidIds)
}
</script>
