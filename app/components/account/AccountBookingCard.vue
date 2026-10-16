<template>
  <article
    :aria-labelledby="titleId"
    class="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6"
  >
    <h3 :id="titleId" class="text-lg font-black text-ink">
      {{ $t('account.booking.title', { date: dateLabel }) }}
    </h3>
    <dl
      class="mt-4 grid gap-x-6 gap-y-0.5 text-sm sm:grid-cols-[max-content_1fr] sm:items-center sm:gap-y-3 [&>dt:not(:first-child)]:mt-3 sm:[&>dt:not(:first-child)]:mt-0"
    >
      <dt class="font-bold text-ink/70">{{ $t('account.booking.status') }}</dt>
      <dd>
        <span
          :class="
            cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1 font-bold',
              props.booking.status === 'paid' && 'bg-paper-2 text-ink',
              props.booking.status === 'completed' && 'bg-green-50 text-green-700',
              props.booking.status === 'cancelled' && 'bg-red-50 text-ink',
            )
          "
        >
          <Icon :name="ACCOUNT_STATUS_ICONS[props.booking.status]" :size="16" aria-hidden="true" />
          {{ $t(`account.booking.statuses.${props.booking.status}`) }}
        </span>
      </dd>
      <dt class="font-bold text-ink/70">{{ $t('account.booking.date') }}</dt>
      <dd class="text-ink">{{ dateLabel }}</dd>
      <dt class="font-bold text-ink/70">{{ $t('account.booking.address') }}</dt>
      <dd class="break-words text-ink">{{ props.booking.address }}</dd>
      <dt class="font-bold text-ink/70">{{ $t('account.booking.services') }}</dt>
      <dd class="text-ink">{{ servicesLabel }}</dd>
      <dt class="font-bold text-ink/70">{{ $t('account.booking.plan') }}</dt>
      <dd class="text-ink">{{ $t(`booking.plans.${props.booking.plan}.title`) }}</dd>
      <dt class="font-bold text-ink/70">{{ $t('account.booking.amount') }}</dt>
      <dd class="font-bold text-ink">
        {{ formatPrice(props.booking.amountTotalCents, locale) }}
      </dd>
    </dl>
    <AccountPhotos
      v-if="props.booking.status === 'completed'"
      :booking-id="props.booking.id"
      :date-label="dateLabel"
      :photos="props.booking.photos"
    />
  </article>
</template>

<script setup lang="ts">
import type { AccountBooking } from '@/types/account'

import { ACCOUNT_STATUS_ICONS } from '@/constants/account'
import { cn } from '@/lib/utils'
import { formatFullDate } from '@/utils/date'
import { formatPrice } from '@/utils/pricing'

const props = withDefaults(
  defineProps<{
    booking: AccountBooking
  }>(),
  {},
)

const { t, locale } = useI18n()

const titleId: ComputedRef<string> = computed(() => `account-booking-${props.booking.id}`)

const dateLabel: ComputedRef<string> = computed(() =>
  formatFullDate(props.booking.scheduledDate, locale.value),
)

const servicesLabel: ComputedRef<string> = computed(() =>
  [
    { quantity: props.booking.smallBinCount, serviceKey: 'booking.bins.small.title' },
    { quantity: props.booking.largeBinCount, serviceKey: 'booking.bins.large.title' },
  ]
    .filter(line => line.quantity > 0)
    .map(line =>
      t('booking.summary.line', { quantity: line.quantity, service: t(line.serviceKey) }),
    )
    .join(' + '),
)
</script>
