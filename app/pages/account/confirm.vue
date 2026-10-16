<template>
  <div class="min-h-[70vh] bg-paper">
    <p class="sr-only" role="status">
      {{ isVerifying ? $t('account.confirm.verifying') : '' }}
    </p>
    <div class="mx-auto max-w-[640px] px-4 py-16 sm:px-8">
      <Motion
        v-if="hasFailed"
        as="section"
        aria-labelledby="confirm-failed-title"
        :initial="{ opacity: 0, y: CONTENT_ENTER_OFFSET }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="CONTENT_ENTER_TRANSITION"
        class="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8"
      >
        <h1
          id="confirm-failed-title"
          ref="failedTitleRef"
          tabindex="-1"
          class="flex items-center gap-2 text-2xl font-black text-ink outline-none"
        >
          <Icon
            name="CircleAlert"
            :size="26"
            aria-hidden="true"
            class="shrink-0 text-destructive"
          />
          {{ $t('account.confirm.failedTitle') }}
        </h1>
        <p class="mt-3 text-[15px] leading-relaxed text-ink/80">
          {{ $t('account.confirm.failedText', { hours: LOGIN_LINK_LIFETIME_HOURS }) }}
        </p>
        <ol
          class="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink marker:font-black"
        >
          <li>{{ $t('account.confirm.steps.open') }}</li>
          <li>{{ $t('account.confirm.steps.email') }}</li>
          <li>{{ $t('account.confirm.steps.click') }}</li>
        </ol>
        <NuxtLink
          :to="localePath('/login')"
          class="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-bold text-white transition-all duration-press ease-brand hover:-translate-y-px hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
        >
          <Icon name="Send" :size="16" aria-hidden="true" />
          {{ $t('account.confirm.loginCta') }}
        </NuxtLink>
      </Motion>

      <div v-else class="flex flex-col items-center gap-4 py-10 text-center">
        <h1 class="sr-only">{{ $t('account.confirm.heading') }}</h1>
        <Icon name="Loader2" :size="32" aria-hidden="true" class="animate-spin text-primary" />
        <p aria-hidden="true" class="text-[15px] font-bold text-ink">
          {{ $t('account.confirm.verifying') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SupabaseClient } from '@supabase/supabase-js'

import { LOGIN_LINK_LIFETIME_HOURS } from '@/constants/account'
import { CONTENT_ENTER_OFFSET, CONTENT_ENTER_TRANSITION } from '@/constants/motion'

definePageMeta({
  layout: 'default',
})

const { t } = useI18n()
const localePath = useLocalePath()
const supabase: SupabaseClient = useSupabaseClient()
const { isActive: isLoggedIn } = useCustomerSession()

const hasFailed: Ref<boolean> = ref(false)
const isVerifying: Ref<boolean> = ref(false)
const failedTitleRef: Ref<HTMLElement | null> = ref(null)

const takeLinkParams = (): URLSearchParams => {
  const params: URLSearchParams = new URLSearchParams(window.location.hash.slice(1))
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}`,
  )
  return params
}

const goToAccount = async (): Promise<void> => {
  await navigateTo(localePath('/account'), { replace: true })
}

const showFailure = async (): Promise<void> => {
  isVerifying.value = false
  hasFailed.value = true
  await nextTick()
  failedTitleRef.value?.focus()
}

const verifyLink = async (): Promise<void> => {
  const params: URLSearchParams = takeLinkParams()
  const tokenHash: string | null = params.get('token_hash')
  if (!tokenHash) {
    await (isLoggedIn.value ? goToAccount() : showFailure())
    return
  }
  isVerifying.value = true
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'email',
  })
  await (error && !isLoggedIn.value ? showFailure() : goToAccount())
}

const runVerification = (): void => {
  if (isVerifying.value) {
    return
  }
  verifyLink().catch(showFailure)
}

const handleHashChange = (): void => {
  if (new URLSearchParams(window.location.hash.slice(1)).has('token_hash')) {
    hasFailed.value = false
    runVerification()
  }
}

onMounted(() => {
  window.addEventListener('hashchange', handleHashChange)
  runVerification()
})

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', handleHashChange)
})

useSeoMeta({
  title: () => t('account.confirm.seo.title'),
  robots: 'noindex, nofollow',
  referrer: 'no-referrer',
})
</script>
