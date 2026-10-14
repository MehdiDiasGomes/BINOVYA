<template>
  <div class="bg-paper">
    <section class="bg-navy-950 pb-10 pt-12">
      <div class="mx-auto max-w-[1180px] px-4 sm:px-8">
        <span
          class="mb-2.5 block text-[12.5px] font-black uppercase tracking-[1.5px] text-turquoise"
        >
          {{ $t('quote.header.eyebrow') }}
        </span>
        <h1 class="text-[32px] font-black leading-tight text-white">
          {{ $t('quote.header.title') }}
        </h1>
        <p class="mt-2 max-w-[560px] text-[15px] leading-relaxed text-[#c4d6e2]">
          {{ $t('quote.header.subtitle') }}
        </p>
      </div>
    </section>

    <div class="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <QuoteSent v-if="isSent" />

      <form
        v-else
        novalidate
        :aria-label="$t('quote.header.title')"
        class="space-y-8 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-8"
        @submit.prevent="submit"
      >
        <fieldset>
          <legend class="text-lg font-black text-ink">{{ $t('quote.sections.contact') }}</legend>
          <div class="mt-4 space-y-5">
            <div class="grid gap-5 sm:grid-cols-2">
              <BookingField
                id="quote-first-name"
                v-model="form.contact.firstName"
                :label="$t('booking.contact.firstName')"
                :placeholder="$t('booking.contact.firstNamePlaceholder')"
                :error="contactErrorFor('firstName')"
                autocomplete="given-name"
              />
              <BookingField
                id="quote-last-name"
                v-model="form.contact.lastName"
                :label="$t('booking.contact.lastName')"
                :placeholder="$t('booking.contact.lastNamePlaceholder')"
                :error="contactErrorFor('lastName')"
                autocomplete="family-name"
              />
            </div>
            <BookingField
              id="quote-company"
              v-model="form.contact.company"
              :label="$t('quote.fields.company')"
              :placeholder="$t('quote.fields.companyPlaceholder')"
              :is-required="false"
              autocomplete="organization"
            />
            <BookingField
              id="quote-email"
              v-model="form.contact.email"
              type="email"
              :label="$t('booking.contact.email')"
              :placeholder="$t('booking.contact.emailPlaceholder')"
              :error="contactErrorFor('email')"
              autocomplete="email"
            />
            <BookingPhoneField
              id="quote-phone"
              v-model="form.contact.phone"
              v-model:country-code="form.contact.phoneCountryCode"
              :label="$t('booking.contact.phone')"
              :country-label="$t('booking.contact.phoneCountry')"
              :placeholder="$t(`booking.contact.phonePlaceholder.${form.contact.phoneCountryCode}`)"
              :error="contactErrorFor('phone')"
            />
          </div>
        </fieldset>

        <Separator />

        <section aria-labelledby="quote-address-title">
          <h2 id="quote-address-title" class="mb-4 text-lg font-black text-ink">
            {{ $t('quote.sections.address') }}
          </h2>
          <BookingAddressSearch id="quote-address" v-model="form.address" />
          <p
            v-if="visibleError('address')"
            role="alert"
            class="mt-1 text-sm font-bold text-destructive"
          >
            {{ $t(visibleError('address') ?? '') }}
          </p>
        </section>

        <Separator />

        <section aria-labelledby="quote-bins-title">
          <h2 id="quote-bins-title" class="mb-4 text-lg font-black text-ink">
            {{ $t('quote.sections.bins') }}
          </h2>
          <ul class="grid gap-4 sm:grid-cols-2">
            <li
              v-for="service in BOOKING_SERVICES"
              :key="service.slug"
              class="flex flex-col items-center gap-3 rounded-xl border border-border bg-white p-5 text-center"
            >
              <NuxtImg
                :src="service.image"
                alt=""
                width="96"
                loading="lazy"
                class="h-24 w-24 object-contain"
              />
              <div>
                <h3 class="text-base font-black text-ink">{{ $t(service.titleKey) }}</h3>
                <p class="mt-0.5 text-sm text-ink/70">{{ $t(service.capacityKey) }}</p>
              </div>
              <BookingQuantityStepper
                :model-value="binCount(service.slug)"
                :service-name="$t(service.titleKey)"
                :max="QUOTE_MAX_BIN_COUNT"
                @update:model-value="setBinCount(service.slug, $event)"
              />
            </li>
          </ul>
          <p
            v-if="visibleError('bins')"
            role="alert"
            class="mt-2 text-sm font-bold text-destructive"
          >
            {{ $t(visibleError('bins') ?? '') }}
          </p>
        </section>

        <Separator />

        <QuotePlanField v-model="form.plan" />

        <Separator />

        <label for="quote-comment" class="block">
          <span class="block text-lg font-black text-ink">{{ $t('quote.comment.label') }}</span>
          <textarea
            id="quote-comment"
            v-model="form.comment"
            rows="5"
            :maxlength="QUOTE_COMMENT_MAX_LENGTH"
            :placeholder="$t('quote.comment.placeholder')"
            class="mt-4 block w-full resize-none rounded-lg border border-ink/25 bg-white px-4 py-3 text-[15px] text-ink outline-none transition-shadow placeholder:text-ink/50 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/30"
          />
        </label>

        <Separator />

        <QuotePhotoPicker v-model="photos" />

        <div aria-hidden="true" class="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label for="quote-website">
            Website
            <input
              id="quote-website"
              v-model="form.website"
              type="text"
              tabindex="-1"
              autocomplete="off"
            />
          </label>
        </div>

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
            :disabled="isSubmitting"
            :aria-busy="isSubmitting"
            class="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-bold text-white shadow-md shadow-primary/30 transition-all hover:-translate-y-px hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BookingContact, ServiceSlug } from '@/types/booking'
import type { QuoteField } from '@/types/quote'

import { BOOKING_SERVICES } from '@/constants/booking'
import { QUOTE_COMMENT_MAX_LENGTH, QUOTE_MAX_BIN_COUNT } from '@/constants/quote'

const { t } = useI18n()
const { form, photos, errors, hasAttempted, isSubmitting, isSent, hasFailed, submit } =
  useQuoteForm()

useSeoMeta({
  title: () => t('quote.seo.title'),
  description: () => t('quote.seo.description'),
  ogTitle: () => t('quote.seo.title'),
  ogDescription: () => t('quote.seo.description'),
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

const visibleError = (field: QuoteField): string | null =>
  hasAttempted.value ? (errors.value[field] ?? null) : null

const contactErrorFor = (field: keyof BookingContact): string => {
  const key: string | undefined = hasAttempted.value
    ? validateContact(form.value.contact)[field]
    : undefined
  return key ? t(key) : ''
}

const binCount = (slug: ServiceSlug): number =>
  slug === 'small-bin' ? form.value.smallBinCount : form.value.largeBinCount

const setBinCount = (slug: ServiceSlug, value: number): void => {
  if (slug === 'small-bin') {
    form.value.smallBinCount = value
  } else {
    form.value.largeBinCount = value
  }
}
</script>
