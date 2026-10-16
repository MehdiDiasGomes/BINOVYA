<template>
  <div class="min-h-[70vh] bg-paper">
    <p class="sr-only" role="status">{{ liveStatus }}</p>
    <section class="pb-2 pt-12 sm:pt-16">
      <div :class="HERO_ENTER_CLASS" class="mx-auto max-w-[640px] px-4 sm:px-8">
        <span class="mb-2.5 block text-[12.5px] font-black uppercase tracking-[1.5px] text-primary">
          {{ $t('account.login.eyebrow') }}
        </span>
        <h1 class="text-[32px] font-black leading-tight text-ink">
          {{ $t('account.login.title') }}
        </h1>
        <p class="mt-2 max-w-[560px] text-[15px] leading-relaxed text-ink/80">
          {{ $t('account.login.subtitle') }}
        </p>
      </div>
    </section>

    <div class="mx-auto max-w-[640px] px-4 pb-16 pt-8 sm:px-8">
      <Motion
        v-if="isSent"
        key="sent"
        as="section"
        aria-labelledby="login-sent-title"
        :initial="{ opacity: 0, y: STEP_OFFSET }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="STEP_TRANSITION"
        class="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8"
      >
        <h2
          id="login-sent-title"
          ref="sentTitleRef"
          tabindex="-1"
          class="flex items-center gap-3 text-2xl font-black text-ink outline-none"
        >
          <Motion
            as="span"
            :initial="{ opacity: 0, scale: 0.5 }"
            :animate="{ opacity: 1, scale: 1 }"
            :transition="POP_SPRING"
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700"
          >
            <Icon name="MailCheck" :size="24" aria-hidden="true" />
          </Motion>
          {{ $t('account.login.sent.title') }}
        </h2>
        <p class="mt-3 text-[15px] leading-relaxed text-ink/80">
          {{ $t('account.login.sent.text') }}
        </p>
        <h3 class="mt-6 text-base font-black text-ink">
          {{ $t('account.login.sent.stepsTitle') }}
        </h3>
        <ol
          class="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink marker:font-black"
        >
          <li>{{ $t('account.login.sent.steps.open') }}</li>
          <li>{{ $t('account.login.sent.steps.spam') }}</li>
          <li>
            {{ $t('account.login.sent.steps.validity', { hours: LOGIN_LINK_LIFETIME_HOURS }) }}
          </li>
        </ol>
        <p class="mt-6 border-t border-border pt-6 text-sm text-ink/80">
          {{ $t('account.login.sent.noBooking') }}
          <NuxtLink
            :to="localePath('/booking')"
            class="rounded-sm font-bold text-ink underline underline-offset-4 transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {{ $t('account.login.sent.bookingCta') }}
          </NuxtLink>
        </p>
        <button
          type="button"
          class="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-ink/50 px-5 text-sm font-bold text-ink transition-all duration-150 hover:border-primary hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 sm:w-auto"
          @click="showLoginForm"
        >
          <Icon name="ArrowLeft" :size="16" aria-hidden="true" />
          {{ $t('account.login.sent.retry') }}
        </button>
      </Motion>

      <form
        v-else
        novalidate
        :aria-label="$t('account.login.formLabel')"
        :class="HERO_ENTER_CLASS"
        class="space-y-5 rounded-2xl border border-border bg-white p-5 shadow-sm delay-150 sm:p-8"
        @submit.prevent="handleSubmit"
      >
        <p
          v-if="isSessionExpired"
          class="flex items-start gap-2 rounded-xl border border-border bg-paper-2 px-4 py-3 text-sm font-bold text-ink"
        >
          <Icon name="Clock" :size="16" aria-hidden="true" class="mt-0.5 shrink-0 text-primary" />
          {{ $t('account.login.sessionExpired') }}
        </p>
        <BookingField
          :id="EMAIL_FIELD_ID"
          v-model="email"
          type="email"
          :label="$t('account.login.email')"
          :placeholder="$t('account.login.emailPlaceholder')"
          :hint="$t('account.login.emailHint')"
          :error="visibleError"
          autocomplete="email"
        />
        <HoneypotField id="login-website" v-model="website" />

        <p
          v-if="hasFailed"
          role="alert"
          class="flex items-center gap-2 text-sm font-bold text-destructive"
        >
          <Icon name="CircleAlert" :size="16" aria-hidden="true" />
          {{ $t('account.login.errors.submit') }}
        </p>
        <button
          type="submit"
          :aria-disabled="isSubmitting"
          :aria-busy="isSubmitting"
          class="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-bold text-white transition-all duration-150 hover:-translate-y-px hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] aria-disabled:cursor-not-allowed aria-disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 sm:w-auto"
        >
          <Icon
            :name="isSubmitting ? 'Loader2' : 'Send'"
            :size="16"
            aria-hidden="true"
            :class="cn(isSubmitting && 'animate-spin')"
          />
          {{ isSubmitting ? $t('account.login.submitting') : $t('account.login.submit') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LOGIN_LINK_LIFETIME_HOURS, SESSION_EXPIRED_QUERY } from '@/constants/account'
import { HERO_ENTER_CLASS, POP_SPRING, STEP_OFFSET, STEP_TRANSITION } from '@/constants/motion'
import { cn } from '@/lib/utils'
import { focusFirstElement } from '@/utils/focus'

definePageMeta({
  layout: 'default',
  middleware: ['guest'],
})

const EMAIL_FIELD_ID = 'login-email'

const { t } = useI18n()
const localePath = useLocalePath()
const { email, website, errorKey, hasAttempted, isSubmitting, isSent, hasFailed, submit, reset } =
  useLoginForm()

const sentTitleRef: Ref<HTMLElement | null> = ref(null)
const isMounted: Ref<boolean> = ref(false)
const route = useRoute()

const isSessionExpired: ComputedRef<boolean> = computed(
  () => route.query.session === SESSION_EXPIRED_QUERY,
)

const liveStatus: ComputedRef<string> = computed(() => {
  if (isSubmitting.value) {
    return t('account.login.submittingStatus')
  }
  return isMounted.value && isSessionExpired.value ? t('account.login.sessionExpired') : ''
})

const visibleError: ComputedRef<string> = computed(() =>
  hasAttempted.value && errorKey.value ? t(errorKey.value) : '',
)

const handleSubmit = async (): Promise<void> => {
  await submit()
  await nextTick()
  if (isSent.value) {
    sentTitleRef.value?.focus()
    return
  }
  if (errorKey.value) {
    focusFirstElement([EMAIL_FIELD_ID])
  }
}

const showLoginForm = async (): Promise<void> => {
  reset()
  await nextTick()
  focusFirstElement([EMAIL_FIELD_ID])
}

onMounted(() => {
  isMounted.value = true
})

useSeoMeta({
  title: () => t('account.login.seo.title'),
  description: () => t('account.login.seo.description'),
  ogTitle: () => t('account.login.seo.title'),
  ogDescription: () => t('account.login.seo.description'),
  ogType: 'website',
})
</script>
