<template>
  <div class="min-h-[70vh] bg-paper">
    <p class="sr-only" role="status">{{ liveStatus }}</p>
    <section class="pb-2 pt-12 sm:pt-16">
      <div
        :class="HERO_ENTER_CLASS"
        class="mx-auto flex max-w-[880px] flex-col gap-6 px-4 sm:flex-row sm:items-end sm:justify-between sm:px-8"
      >
        <div>
          <span
            class="mb-2.5 block text-[12.5px] font-black uppercase tracking-[1.5px] text-primary"
          >
            {{ $t('account.dashboard.eyebrow') }}
          </span>
          <h1
            ref="titleRef"
            tabindex="-1"
            class="text-[32px] font-black leading-tight text-ink outline-none"
          >
            {{ greeting }}
          </h1>
          <p class="mt-2 max-w-[560px] text-[15px] leading-relaxed text-ink/80">
            {{ $t('account.dashboard.subtitle') }}
          </p>
        </div>
        <AppButton
          variant="secondary"
          icon="LogOut"
          :is-loading="isSigningOut"
          :aria-busy="isSigningOut"
          class="self-start sm:self-auto"
          @click="signOut"
        >
          {{ isSigningOut ? $t('account.dashboard.signingOut') : $t('account.dashboard.signOut') }}
        </AppButton>
      </div>
    </section>

    <div class="mx-auto max-w-[880px] space-y-10 px-4 pb-16 pt-8 sm:px-8">
      <section aria-labelledby="account-bookings-title">
        <h2
          id="account-bookings-title"
          ref="bookingsTitleRef"
          tabindex="-1"
          class="text-[22px] font-black text-ink outline-none"
        >
          {{ $t('account.dashboard.bookingsTitle') }}
        </h2>

        <ul v-if="isLoading" aria-hidden="true" class="mt-4 grid gap-6 sm:grid-cols-2">
          <li
            v-for="placeholder in ACCOUNT_SKELETON_CARD_COUNT"
            :key="placeholder"
            :class="cn(placeholder > ACCOUNT_SKELETON_MOBILE_CARD_COUNT && 'hidden sm:block')"
          >
            <MediaCardSkeleton />
          </li>
        </ul>

        <div v-else-if="error || !overview" role="alert" class="mt-4">
          <p :class="ERROR_MESSAGE_CLASS">
            <Icon name="CircleAlert" :size="16" aria-hidden="true" />
            {{ $t('account.dashboard.loadError') }}
          </p>
          <AppButton
            ref="retryRef"
            variant="secondary"
            icon="RotateCw"
            class="mt-3"
            @click="reload"
          >
            {{ $t('account.dashboard.retry') }}
          </AppButton>
        </div>

        <Motion
          v-else-if="overview.bookings.length === 0"
          :initial="{ opacity: 0, y: CONTENT_ENTER_OFFSET }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="CONTENT_ENTER_TRANSITION"
          class="mt-4 rounded-2xl border border-border bg-white p-6 shadow-sm"
        >
          <h3 class="text-lg font-black text-ink">{{ $t('account.dashboard.empty.title') }}</h3>
          <p class="mt-1.5 text-sm text-ink/80">{{ $t('account.dashboard.empty.text') }}</p>
          <AppButton :to="localePath('/booking')" icon="CalendarCheck" class="mt-4">
            {{ $t('account.dashboard.empty.cta') }}
          </AppButton>
        </Motion>

        <ul v-else role="list" class="mt-4 grid gap-6 sm:grid-cols-2">
          <Reveal
            v-for="(booking, index) in overview.bookings"
            :key="booking.id"
            as="li"
            :delay="Math.min(index, REVEAL_MAX_STAGGER_STEPS) * REVEAL_STAGGER"
          >
            <AccountBookingCard :booking="booking" />
          </Reveal>
        </ul>
      </section>

      <AccountDeletionRequest
        v-if="overview"
        :initial-requested-at="overview.deletionRequestedAt"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AccountOverview } from '@/types/account'
import type { FocusTarget } from '@/types/button'

import {
  ACCOUNT_SKELETON_CARD_COUNT,
  ACCOUNT_SKELETON_MOBILE_CARD_COUNT,
  PAGE_DATA_TIMEOUT_MS,
} from '@/constants/account'
import { ERROR_MESSAGE_CLASS } from '@/constants/feedback'
import {
  CONTENT_ENTER_OFFSET,
  CONTENT_ENTER_TRANSITION,
  HERO_ENTER_CLASS,
  REVEAL_MAX_STAGGER_STEPS,
  REVEAL_STAGGER,
} from '@/constants/motion'
import { PRIVATE_PAGE_ROBOTS } from '@/constants/seo'
import { cn } from '@/lib/utils'

definePageMeta({
  layout: 'default',
  middleware: ['customer'],
})

const { t } = useI18n()
const localePath = useLocalePath()
const { endSession } = useCustomerSession()

const {
  data: overview,
  status,
  error,
  refresh,
} = useFetch<AccountOverview>('/api/account/bookings', {
  key: 'account-overview',
  server: false,
  lazy: true,
  timeout: PAGE_DATA_TIMEOUT_MS,
})

const titleRef: Ref<HTMLElement | null> = ref(null)
const bookingsTitleRef: Ref<HTMLElement | null> = ref(null)
const retryRef: Ref<FocusTarget | null> = ref(null)
const isSigningOut: Ref<boolean> = ref(false)

const hasLoaded: ComputedRef<boolean> = computed(() => Boolean(overview.value) && !error.value)

const { isLoading, isMounted, reload } = useAccountPageState({
  status,
  error,
  refresh,
  titleRef,
  retryRef,
  hasLoaded,
  loadedFocusRef: bookingsTitleRef,
})

const liveStatus: ComputedRef<string> = computed(() => {
  if (!isMounted.value) {
    return ''
  }
  if (isSigningOut.value) {
    return t('account.dashboard.signingOut')
  }
  return isLoading.value ? t('account.dashboard.loading') : ''
})

const greeting: ComputedRef<string> = computed(() =>
  overview.value?.firstName
    ? t('account.dashboard.greeting', { name: overview.value.firstName })
    : t('account.dashboard.greetingFallback'),
)

const goToLogin = async (): Promise<void> => {
  await navigateTo(localePath('/login'), { replace: true })
}

const signOut = async (): Promise<void> => {
  if (isSigningOut.value) {
    return
  }
  isSigningOut.value = true
  try {
    await endSession()
  } finally {
    await goToLogin()
  }
}

useSeoMeta({
  title: () => t('account.dashboard.seo.title'),
  robots: PRIVATE_PAGE_ROBOTS,
})
</script>
