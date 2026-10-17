<template>
  <div class="min-h-[70vh]">
    <p class="sr-only" role="status">{{ liveStatus }}</p>
    <section class="pb-2 pt-12 sm:pt-16">
      <div :class="HERO_ENTER_CLASS" class="mx-auto max-w-[640px] px-4 sm:px-8">
        <span class="mb-2.5 block text-[12.5px] font-black uppercase tracking-[1.5px] text-primary">
          {{ $t('pro.login.eyebrow') }}
        </span>
        <h1 class="text-[32px] font-black leading-tight text-ink">
          {{ $t('pro.login.title') }}
        </h1>
        <p class="mt-2 max-w-[560px] text-[15px] leading-relaxed text-ink/80">
          {{ $t('pro.login.subtitle') }}
        </p>
      </div>
    </section>

    <div class="mx-auto max-w-[640px] px-4 pb-16 pt-8 sm:px-8">
      <Motion
        v-if="isSent"
        as="section"
        aria-labelledby="pro-login-sent-title"
        :initial="{ opacity: 0, y: STEP_OFFSET }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="STEP_TRANSITION"
        class="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8"
      >
        <h2
          id="pro-login-sent-title"
          ref="sentTitleRef"
          tabindex="-1"
          class="flex items-center gap-3 text-2xl font-black text-ink outline-none"
        >
          <Motion
            as="span"
            :initial="{ opacity: 0, scale: 0.5 }"
            :animate="{ opacity: 1, scale: 1 }"
            :transition="POP_SPRING"
            class="flex size-11 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700"
          >
            <Icon name="MailCheck" :size="24" aria-hidden="true" />
          </Motion>
          {{ $t('pro.login.sent.title') }}
        </h2>
        <p class="mt-3 text-[15px] leading-relaxed text-ink/80">
          {{ $t('pro.login.sent.text', { hours: LOGIN_LINK_LIFETIME_HOURS }) }}
        </p>
        <AppButton
          variant="secondary"
          icon="ArrowLeft"
          class="mt-6 w-full sm:w-auto"
          @click="showLoginForm"
        >
          {{ $t('pro.login.sent.retry') }}
        </AppButton>
      </Motion>

      <form
        v-else
        novalidate
        :aria-label="$t('pro.login.formLabel')"
        :class="HERO_ENTER_CLASS"
        class="space-y-5 rounded-2xl border border-border bg-white p-5 shadow-sm delay-150 sm:p-8"
        @submit.prevent="handleSubmit"
      >
        <NoticeBanner
          v-if="activeNotice"
          :icon="activeNotice.icon"
          :icon-class="activeNotice.iconClass"
          :text="activeNotice.text"
        />
        <BookingField
          :id="EMAIL_FIELD_ID"
          v-model="email"
          type="email"
          :label="$t('pro.login.email')"
          :placeholder="$t('pro.login.emailPlaceholder')"
          :error="visibleError"
          autocomplete="email"
        />
        <HoneypotField id="pro-login-website" v-model="website" />

        <p
          v-if="hasFailed"
          role="alert"
          class="flex items-center gap-2 text-sm font-bold text-destructive"
        >
          <Icon name="CircleAlert" :size="16" aria-hidden="true" />
          {{ $t('pro.login.submitError') }}
        </p>
        <AppButton type="submit" icon="Send" :is-loading="isSubmitting" class="w-full sm:w-auto">
          {{ isSubmitting ? $t('pro.login.submitting') : $t('pro.login.submit') }}
        </AppButton>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LoginNotice } from '@/types/loginPage'

import {
  LINK_SESSION_MAX_AGE_DAYS,
  LOGIN_LINK_LIFETIME_HOURS,
  SESSION_EXPIRED_QUERY,
} from '@/constants/account'
import { HERO_ENTER_CLASS, POP_SPRING, STEP_OFFSET, STEP_TRANSITION } from '@/constants/motion'
import { PRO_ACCESS_DENIED_QUERY } from '@/constants/pro'

definePageMeta({
  layout: 'pro',
  middleware: ['admin-guest'],
})

const EMAIL_FIELD_ID: string = 'pro-login-email'

const { t } = useI18n()
const route = useRoute()
const sentTitleRef: Ref<HTMLElement | null> = ref(null)
const isMounted: Ref<boolean> = ref(false)

const {
  email,
  website,
  isSubmitting,
  isSent,
  hasFailed,
  visibleError,
  handleSubmit,
  showLoginForm,
} = useLoginPage({ endpoint: '/api/pro/auth/login', emailFieldId: EMAIL_FIELD_ID, sentTitleRef })

const activeNotice: ComputedRef<LoginNotice | null> = computed((): LoginNotice | null => {
  if (route.query.session === SESSION_EXPIRED_QUERY) {
    return {
      icon: 'Clock',
      iconClass: 'text-primary',
      text: t('pro.login.sessionExpired', { days: LINK_SESSION_MAX_AGE_DAYS }),
    }
  }
  if (route.query.access === PRO_ACCESS_DENIED_QUERY) {
    return { icon: 'ShieldAlert', iconClass: 'text-destructive', text: t('pro.login.accessDenied') }
  }
  return null
})

const liveStatus: ComputedRef<string> = computed(() => {
  if (isSubmitting.value) {
    return t('pro.login.submittingStatus')
  }
  return isMounted.value ? (activeNotice.value?.text ?? '') : ''
})

onMounted(() => {
  isMounted.value = true
})

useSeoMeta({
  title: () => t('pro.login.seo.title'),
  robots: 'noindex, nofollow',
})
</script>
