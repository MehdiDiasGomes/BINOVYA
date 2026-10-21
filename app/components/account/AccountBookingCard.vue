<template>
  <MediaCard :title="dateLabel" :subtitle="props.booking.address" :tone="view.tone" interactive>
    <template #eyebrow>
      <Icon :name="view.icon" :size="16" :stroke-width="2.5" aria-hidden="true" class="shrink-0" />
      <p>{{ $t(view.statusKey) }}</p>
    </template>

    <dl class="grid gap-1 text-[15px]">
      <div class="flex justify-between gap-3">
        <dt class="text-white/80">{{ $t('account.booking.services') }}</dt>
        <dd class="text-right font-semibold">{{ servicesLabel }}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt class="text-white/80">{{ $t('account.booking.plan') }}</dt>
        <dd class="text-right font-semibold">
          {{ $t(`booking.plans.${props.booking.plan}.title`) }}
        </dd>
      </div>
    </dl>

    <template #footer>
      <dl class="flex items-baseline justify-between gap-3 text-sm text-white/80">
        <dt>{{ $t(view.amountKey) }}</dt>
        <dd class="font-heading text-lg font-bold tabular-nums text-white">
          {{ formatPrice(props.booking.amountTotalCents, locale) }}
        </dd>
      </dl>
    </template>

    <template #action>
      <div class="flex flex-col gap-4.5">
        <AccountBookingReminder v-if="view.showReminder" />
        <AppButton
          :to="localePath(`/account/bookings/${props.booking.id}`)"
          variant="onDark"
          class="w-full"
        >
          {{ $t('account.booking.view') }}
          <span class="sr-only">{{ $t('account.booking.viewContext', { date: linkDate }) }}</span>
        </AppButton>
      </div>
    </template>
  </MediaCard>
</template>

<script setup lang="ts">
import type { AccountBooking, AccountBookingCardView } from '@/types/account'

import { bookingCardView, bookingDateLabel, bookingServicesLabel } from '@/utils/accountBookingCard'
import { formatFullDate } from '@/utils/date'
import { formatPrice } from '@/utils/pricing'

const props = withDefaults(
  defineProps<{
    booking: AccountBooking
  }>(),
  {},
)

const { t, locale } = useI18n()
const localePath = useLocalePath()

const view: ComputedRef<AccountBookingCardView> = computed(() => bookingCardView(props.booking))

const dateLabel: ComputedRef<string> = computed(() =>
  bookingDateLabel(props.booking.scheduledDate, locale.value),
)

const linkDate: ComputedRef<string> = computed(() =>
  formatFullDate(props.booking.scheduledDate, locale.value),
)

const servicesLabel: ComputedRef<string> = computed(() => bookingServicesLabel(props.booking, t))
</script>
