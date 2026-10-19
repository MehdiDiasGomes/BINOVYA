<template>
  <div class="min-h-[70vh] bg-paper">
    <p class="sr-only" role="status" aria-live="polite">{{ liveStatus }}</p>
    <div class="mx-auto max-w-[880px] px-4 pb-16 pt-12 sm:px-8 sm:pt-16">
      <NuxtLink :to="localePath('/account')" :class="BACK_LINK_CLASS">
        <Icon name="ArrowLeft" :size="16" aria-hidden="true" />
        {{ $t('account.detail.back') }}
      </NuxtLink>

      <span
        class="mb-2.5 mt-6 block text-[12.5px] font-black uppercase tracking-[1.5px] text-primary"
      >
        {{ $t('account.detail.eyebrow') }}
      </span>
      <h1
        ref="titleRef"
        tabindex="-1"
        class="text-[32px] font-black leading-tight text-ink outline-none"
      >
        {{ heading }}
      </h1>

      <div
        v-if="isLoading"
        aria-hidden="true"
        class="mt-8 grid gap-8 lg:grid-cols-2 lg:items-start"
      >
        <MediaCardSkeleton :detail-rows="4" :has-subtitle="false" stack-rows :has-action="false" />
        <AccountBookingDocumentsSkeleton />
      </div>

      <div
        v-else-if="isNotFound"
        class="mt-6 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-8"
      >
        <p class="text-[15px] text-ink/80">{{ $t('account.detail.notFound.text') }}</p>
      </div>

      <div v-else-if="booking && view" class="mt-8 grid gap-8 lg:grid-cols-2 lg:items-start">
        <Motion
          :initial="{ opacity: 0, y: CONTENT_ENTER_OFFSET }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="CONTENT_ENTER_TRANSITION"
        >
          <MediaCard :title="$t('account.detail.summaryTitle')" title-tag="h2" :tone="view.tone">
            <template #eyebrow>
              <Icon
                :name="view.icon"
                :size="16"
                :stroke-width="2.5"
                aria-hidden="true"
                class="shrink-0"
              />
              <p>{{ $t(view.statusKey) }}</p>
            </template>

            <dl class="grid gap-2 text-[15px]">
              <div v-for="detail in details" :key="detail.labelKey" :class="DETAIL_ROW_CLASS">
                <dt class="text-white/80">{{ $t(detail.labelKey) }}</dt>
                <dd class="break-words font-semibold sm:text-right">{{ detail.value }}</dd>
              </div>
            </dl>

            <template #footer>
              <dl class="flex items-baseline justify-between gap-3 text-sm text-white/80">
                <dt>{{ $t(view.amountKey) }}</dt>
                <dd class="font-heading text-lg font-bold tabular-nums text-white">
                  {{ formatPrice(booking.amountTotalCents, locale) }}
                </dd>
              </dl>
            </template>

            <template v-if="view.showReminder" #action>
              <AccountBookingReminder />
            </template>
          </MediaCard>
        </Motion>

        <Motion
          :initial="{ opacity: 0, y: CONTENT_ENTER_OFFSET }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ ...CONTENT_ENTER_TRANSITION, delay: REVEAL_STAGGER }"
          class="space-y-8"
        >
          <AccountBookingDocuments
            :show-photos="!view.showRebook"
            :is-completed="booking.status === 'completed'"
            :documents="documents"
            :refresh-links="refreshLinks"
          />

          <AppButton
            v-if="view.showRebook"
            :to="localePath('/booking')"
            icon="CalendarCheck"
            class="w-full sm:w-auto"
          >
            {{ $t('account.detail.rebook') }}
          </AppButton>
        </Motion>
      </div>

      <div v-else role="alert" class="mt-6">
        <p class="flex items-center gap-2 text-sm font-bold text-destructive">
          <Icon name="CircleAlert" :size="16" aria-hidden="true" />
          {{ $t('account.detail.loadError') }}
        </p>
        <AppButton ref="retryRef" variant="secondary" icon="RotateCw" class="mt-3" @click="reload">
          {{ $t('account.detail.retry') }}
        </AppButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FetchError } from 'ofetch'

import type {
  AccountBooking,
  AccountBookingCardView,
  AccountBookingDetail,
  AccountBookingDocuments,
  AccountDetailRow,
  AccountLinksRefresh,
} from '@/types/account'
import type { FocusTarget } from '@/types/button'

import { BACK_LINK_CLASS } from '@/constants/buttons'
import { DETAIL_ROW_CLASS } from '@/constants/mediaCard'
import { CONTENT_ENTER_OFFSET, CONTENT_ENTER_TRANSITION, REVEAL_STAGGER } from '@/constants/motion'
import { bookingCardView, bookingDateLabel, bookingServicesLabel } from '@/utils/accountBookingCard'
import { formatFullDate } from '@/utils/date'
import { formatPrice } from '@/utils/pricing'

definePageMeta({
  layout: 'default',
  middleware: ['customer'],
})

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const bookingId: ComputedRef<string> = computed(() => String(route.params.id ?? ''))

const { data, status, error, refresh } = useFetch<AccountBookingDetail>(
  () => `/api/account/bookings/${encodeURIComponent(bookingId.value)}`,
  {
    key: () => `account-booking-${bookingId.value}`,
    server: false,
    lazy: true,
  },
)

const titleRef: Ref<HTMLElement | null> = ref(null)
const retryRef: Ref<FocusTarget | null> = ref(null)

const booking: ComputedRef<AccountBooking | null> = computed(() => data.value?.booking ?? null)

const isNotFound: ComputedRef<boolean> = computed(() =>
  [400, 404].includes(error.value?.statusCode ?? 0),
)

const hasLoaded: ComputedRef<boolean> = computed(() => Boolean(booking.value) || isNotFound.value)

const hasContent: ComputedRef<boolean> = computed(() => Boolean(booking.value))

const { isLoading, isMounted, reload } = useAccountPageState({
  status,
  error,
  refresh,
  titleRef,
  retryRef,
  hasLoaded,
  hasContent,
})

const { expireSession } = useCustomerSession()

const documents: Ref<AccountBookingDocuments | undefined> = ref(undefined)

watch(
  () => data.value?.documents,
  (latest: AccountBookingDocuments | undefined): void => {
    if (latest) {
      documents.value = latest
    }
  },
  { immediate: true },
)

/**
 * Fetches fresh photo links without the page `refresh()`, which would clear the whole booking
 * when it fails, and replaces only the documents. A 401 expires the customer session.
 * @returns `ok` when refreshed, `expired` when the session ended, `failed` otherwise
 */
const refreshLinks = async (): Promise<AccountLinksRefresh> => {
  try {
    const latest: AccountBookingDetail = await $fetch<AccountBookingDetail>(
      `/api/account/bookings/${encodeURIComponent(bookingId.value)}`,
    )
    documents.value = latest.documents
    return 'ok'
  } catch (fetchError: unknown) {
    if (fetchError instanceof FetchError && fetchError.statusCode === 401) {
      await expireSession()
      return 'expired'
    }
    return 'failed'
  }
}

const view: ComputedRef<AccountBookingCardView | null> = computed(() =>
  booking.value ? bookingCardView(booking.value) : null,
)

const heading: ComputedRef<string> = computed(() => {
  if (booking.value) {
    return t('account.detail.title', {
      date: formatFullDate(booking.value.scheduledDate, locale.value),
    })
  }
  return isNotFound.value ? t('account.detail.notFound.title') : t('account.detail.titleFallback')
})

const details: ComputedRef<AccountDetailRow[]> = computed(() => {
  const current: AccountBooking | null = booking.value
  if (!current) {
    return []
  }
  return [
    {
      labelKey: 'account.detail.date',
      value: bookingDateLabel(current.scheduledDate, locale.value),
    },
    { labelKey: 'account.detail.address', value: current.address },
    { labelKey: 'account.booking.services', value: bookingServicesLabel(current, t) },
    { labelKey: 'account.booking.plan', value: t(`booking.plans.${current.plan}.title`) },
  ]
})

const liveStatus: ComputedRef<string> = computed(() =>
  isMounted.value && isLoading.value ? t('account.detail.loading') : '',
)

useSeoMeta({
  title: () => t('account.detail.seo.title'),
  robots: 'noindex, nofollow',
})
</script>
