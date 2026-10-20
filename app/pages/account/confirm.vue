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
            :class="cn('shrink-0', ERROR_TEXT_TONE_CLASS)"
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
        <AppButton :to="localePath('/login')" icon="Send" class="mt-6">
          {{ $t('account.confirm.loginCta') }}
        </AppButton>
      </Motion>

      <div v-else class="flex flex-col items-center gap-4 py-10 text-center">
        <h1 class="sr-only">{{ $t('account.confirm.heading') }}</h1>
        <Icon
          name="Loader2"
          :size="32"
          aria-hidden="true"
          class="animate-spin text-primary motion-reduce:animate-none"
        />
        <p aria-hidden="true" class="text-[15px] font-bold text-ink">
          {{ $t('account.confirm.verifying') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LOGIN_LINK_LIFETIME_HOURS } from '@/constants/account'
import { ERROR_TEXT_TONE_CLASS } from '@/constants/feedback'
import { CONTENT_ENTER_OFFSET, CONTENT_ENTER_TRANSITION } from '@/constants/motion'
import { cn } from '@/lib/utils'

definePageMeta({
  layout: 'default',
})

const { t } = useI18n()
const localePath = useLocalePath()
const { isActive: isLoggedIn } = useCustomerSession()

const failedTitleRef: Ref<HTMLElement | null> = ref(null)

const { hasFailed, isVerifying } = useLoginLinkConfirm({
  targetPath: '/account',
  isLoggedIn,
  failedTitleRef,
})

useSeoMeta({
  title: () => t('account.confirm.seo.title'),
  robots: 'noindex, nofollow',
  referrer: 'no-referrer',
})
</script>
