<template>
  <div class="bg-paper">
    <section class="bg-navy-950 pb-10 pt-12">
      <div class="mx-auto max-w-[1180px] px-4 sm:px-8">
        <span
          :class="HERO_ENTER_CLASS"
          class="mb-2.5 block text-[12.5px] font-black uppercase tracking-[1.5px] text-turquoise"
        >
          {{ $t('contact.header.eyebrow') }}
        </span>
        <h1
          :class="HERO_ENTER_CLASS"
          class="delay-75 text-[32px] font-black leading-tight text-white"
        >
          {{ $t('contact.header.title') }}
        </h1>
        <p
          :class="HERO_ENTER_CLASS"
          class="delay-150 mt-2 max-w-[560px] text-[15px] leading-relaxed text-[#c4d6e2]"
        >
          {{ $t('contact.header.subtitle') }}
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
            <FormSent :title="$t('contact.sent.title')" :text="$t('contact.sent.text')" />
          </Motion>
          <Motion
            v-else
            key="form"
            :initial="{ opacity: 0, y: STEP_OFFSET }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="{ opacity: 0 }"
            :transition="STEP_TRANSITION"
          >
            <ContactForm
              v-model="form"
              :errors="errors"
              :show-errors="hasAttempted"
              :is-submitting="isSubmitting"
              :has-failed="hasFailed"
              @submit="submit"
            />
          </Motion>
        </AnimatePresence>
      </div>

      <aside
        :aria-label="$t('contact.info.label')"
        :class="HERO_ENTER_CLASS"
        class="delay-300 space-y-4 lg:sticky lg:top-24"
      >
        <div class="rounded-2xl border border-border bg-paper-2 p-5 shadow-sm sm:p-6">
          <h2 class="text-lg font-black text-ink">{{ $t('contact.quote.title') }}</h2>
          <p class="mt-1.5 text-sm leading-relaxed text-ink/80">{{ $t('contact.quote.text') }}</p>
          <NuxtLink
            :to="localePath('/quote')"
            class="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Icon name="FileText" :size="16" aria-hidden="true" />
            {{ $t('contact.quote.cta') }}
          </NuxtLink>
        </div>

        <ul class="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
          <li class="flex items-center gap-3 text-sm text-ink">
            <Icon name="Mail" :size="18" aria-hidden="true" class="shrink-0 text-primary" />
            <a
              :href="`mailto:${$t('contact.info.email.address')}`"
              class="break-all rounded-sm font-bold underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {{ $t('contact.info.email.address') }}
            </a>
          </li>
          <li class="flex items-start gap-3 text-sm text-ink">
            <Icon
              name="MapPin"
              :size="18"
              aria-hidden="true"
              class="mt-0.5 shrink-0 text-primary"
            />
            <p>
              {{ $t('contact.info.address.line1') }}<br />
              {{ $t('contact.info.address.line2') }}
            </p>
          </li>
        </ul>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { HERO_ENTER_CLASS, STEP_OFFSET, STEP_TRANSITION } from '@/constants/motion'

definePageMeta({
  layout: 'default',
})

const { t } = useI18n()
const localePath = useLocalePath()
const { form, errors, hasAttempted, isSubmitting, isSent, hasFailed, submit } = useContactForm()

useSeoMeta({
  title: () => t('seo.contact.title'),
  description: () => t('seo.contact.description'),
  ogTitle: () => t('seo.contact.title'),
  ogDescription: () => t('seo.contact.description'),
  ogType: 'website',
  twitterCard: 'summary_large_image',
})
</script>
