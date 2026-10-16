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
        <button
          type="button"
          :aria-disabled="isSigningOut"
          :aria-busy="isSigningOut"
          class="flex h-11 items-center justify-center gap-2 self-start rounded-lg border border-ink/50 bg-white px-5 text-sm font-bold text-ink transition-all duration-150 hover:border-primary hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] aria-disabled:cursor-not-allowed aria-disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100 sm:self-auto"
          @click="signOut"
        >
          <Icon name="LogOut" :size="16" aria-hidden="true" />
          {{ isSigningOut ? $t('account.dashboard.signingOut') : $t('account.dashboard.signOut') }}
        </button>
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

        <p
          v-if="isLoading"
          aria-hidden="true"
          class="mt-4 flex items-center gap-2 text-[15px] font-bold text-ink"
        >
          <Icon name="Loader2" :size="18" aria-hidden="true" class="animate-spin text-primary" />
          {{ $t('account.dashboard.loading') }}
        </p>

        <div v-else-if="error || !overview" role="alert" class="mt-4">
          <p class="flex items-center gap-2 text-sm font-bold text-destructive">
            <Icon name="CircleAlert" :size="16" aria-hidden="true" />
            {{ $t('account.dashboard.loadError') }}
          </p>
          <button
            type="button"
            class="mt-3 flex h-11 items-center justify-center gap-2 rounded-lg border border-ink/50 px-5 text-sm font-bold text-ink transition-all duration-150 hover:border-primary hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
            @click="reload"
          >
            <Icon name="RotateCw" :size="16" aria-hidden="true" />
            {{ $t('account.dashboard.retry') }}
          </button>
        </div>

        <Motion
          v-else-if="overview.bookings.length === 0"
          key="empty"
          :initial="{ opacity: 0, y: STEP_OFFSET }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="STEP_TRANSITION"
          class="mt-4 rounded-2xl border border-border bg-white p-6 shadow-sm"
        >
          <h3 class="text-lg font-black text-ink">{{ $t('account.dashboard.empty.title') }}</h3>
          <p class="mt-1.5 text-sm text-ink/80">{{ $t('account.dashboard.empty.text') }}</p>
          <NuxtLink
            :to="localePath('/booking')"
            class="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-white transition-all duration-150 hover:-translate-y-px hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
          >
            <Icon name="CalendarCheck" :size="16" aria-hidden="true" />
            {{ $t('account.dashboard.empty.cta') }}
          </NuxtLink>
        </Motion>

        <ul v-else class="mt-4 space-y-5">
          <Reveal
            v-for="(booking, index) in overview.bookings"
            :key="booking.id"
            as="li"
            :delay="Math.min(index, 3) * REVEAL_STAGGER"
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

import { HERO_ENTER_CLASS, REVEAL_STAGGER, STEP_OFFSET, STEP_TRANSITION } from '@/constants/motion'

definePageMeta({
  layout: 'default',
  middleware: ['customer'],
})

const { t } = useI18n()
const localePath = useLocalePath()
const { endSession, expireSession } = useCustomerSession()

const {
  data: overview,
  status,
  error,
  refresh,
} = useFetch<AccountOverview>('/api/account/bookings', {
  key: 'account-overview',
  server: false,
  lazy: true,
})

const titleRef: Ref<HTMLElement | null> = ref(null)
const bookingsTitleRef: Ref<HTMLElement | null> = ref(null)
const isSigningOut: Ref<boolean> = ref(false)
const isMounted: Ref<boolean> = ref(false)

const isLoading: ComputedRef<boolean> = computed(
  () => status.value === 'idle' || status.value === 'pending',
)

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

const reload = async (): Promise<void> => {
  try {
    await refresh()
  } finally {
    await nextTick()
    bookingsTitleRef.value?.focus()
  }
}

watch(error, async (): Promise<void> => {
  if (error.value?.statusCode === 401) {
    await expireSession()
  }
})

watch(
  isLoading,
  async (loading: boolean): Promise<void> => {
    if (!loading) {
      await nextTick()
      titleRef.value?.focus()
    }
  },
  { once: true },
)

onMounted(() => {
  isMounted.value = true
})

useSeoMeta({
  title: () => t('account.dashboard.seo.title'),
  robots: 'noindex, nofollow',
})
</script>
