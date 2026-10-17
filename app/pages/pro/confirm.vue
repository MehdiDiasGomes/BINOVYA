<template>
  <div class="min-h-[70vh]">
    <p class="sr-only" role="status">
      {{ isVerifying ? $t('pro.confirm.verifying') : '' }}
    </p>
    <div class="mx-auto max-w-[640px] px-4 py-16 sm:px-8">
      <Motion
        v-if="hasFailed"
        as="section"
        aria-labelledby="pro-confirm-failed-title"
        :initial="{ opacity: 0, y: CONTENT_ENTER_OFFSET }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="CONTENT_ENTER_TRANSITION"
        class="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8"
      >
        <h1
          id="pro-confirm-failed-title"
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
          {{ $t('pro.confirm.failedTitle') }}
        </h1>
        <p class="mt-3 text-[15px] leading-relaxed text-ink/80">
          {{ $t('pro.confirm.failedText', { hours: LOGIN_LINK_LIFETIME_HOURS }) }}
        </p>
        <AppButton :to="localePath(PRO_LOGIN_PATH)" icon="Send" class="mt-6">
          {{ $t('pro.confirm.loginCta') }}
        </AppButton>
      </Motion>

      <div v-else class="flex flex-col items-center gap-4 py-10 text-center">
        <h1 class="sr-only">{{ $t('pro.confirm.heading') }}</h1>
        <Icon
          name="Loader2"
          :size="32"
          aria-hidden="true"
          class="animate-spin text-primary motion-reduce:animate-none"
        />
        <p aria-hidden="true" class="text-[15px] font-bold text-ink">
          {{ $t('pro.confirm.verifying') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LOGIN_LINK_LIFETIME_HOURS } from '@/constants/account'
import { CONTENT_ENTER_OFFSET, CONTENT_ENTER_TRANSITION } from '@/constants/motion'
import { PRO_HOME_PATH, PRO_LOGIN_PATH } from '@/constants/pro'

definePageMeta({
  layout: 'pro',
})

const { t } = useI18n()
const localePath = useLocalePath()
const { isAdmin } = useAdminSession()

const failedTitleRef: Ref<HTMLElement | null> = ref(null)

const { hasFailed, isVerifying } = useLoginLinkConfirm({
  targetPath: PRO_HOME_PATH,
  isLoggedIn: isAdmin,
  failedTitleRef,
})

useSeoMeta({
  title: () => t('pro.confirm.seo.title'),
  robots: 'noindex, nofollow',
  referrer: 'no-referrer',
})
</script>
