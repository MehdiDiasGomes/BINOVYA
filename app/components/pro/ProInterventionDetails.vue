<template>
  <section
    :aria-labelledby="titleId"
    class="rounded-2xl border border-border bg-white p-5 shadow-sm"
  >
    <h2 :id="titleId" class="text-lg font-black text-ink">
      {{ $t('pro.steps.details.title') }}
    </h2>
    <dl class="mt-3 grid gap-2 text-[15px]">
      <div v-if="props.intervention.customer?.phone" :class="DETAIL_ROW_CLASS">
        <dt class="text-ink/80">{{ $t('pro.intervention.phone') }}</dt>
        <dd class="font-semibold sm:text-right">
          <a
            :href="telHref(props.intervention.customer.phone)"
            class="inline-flex min-h-11 items-center gap-2 rounded-sm text-primary underline underline-offset-4 transition-colors duration-press ease-brand hover:text-navy-800 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            <Icon name="Phone" :size="16" aria-hidden="true" />
            {{ props.intervention.customer.phone }}
          </a>
        </dd>
      </div>
      <div v-for="row in rows" :key="row.labelKey" :class="DETAIL_ROW_CLASS">
        <dt class="text-ink/80">{{ $t(row.labelKey) }}</dt>
        <dd class="break-words font-semibold sm:text-right">{{ row.value }}</dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import type { AccountDetailRow } from '@/types/account'
import type { ProIntervention } from '@/types/pro'

import { DETAIL_ROW_CLASS } from '@/constants/mediaCard'
import { bookingDateLabel, bookingServicesLabel } from '@/utils/accountBookingCard'
import { telHref } from '@/utils/phone'
import { formatPrice } from '@/utils/pricing'
import { collectionWeekdaysLabel, proInterventionView } from '@/utils/proIntervention'

const props = defineProps<{
  intervention: ProIntervention
}>()

const { t, locale } = useI18n()

const titleId: string = useId()

const weekdaysValue = (weekdays: number[]): string =>
  collectionWeekdaysLabel(weekdays, locale.value) || t('pro.intervention.unknownDays')

const rows: ComputedRef<AccountDetailRow[]> = computed(() => [
  {
    labelKey: 'pro.intervention.date',
    value: bookingDateLabel(props.intervention.scheduledDate, locale.value),
  },
  { labelKey: 'pro.intervention.bins', value: bookingServicesLabel(props.intervention, t) },
  {
    labelKey: 'pro.intervention.plan',
    value: t(`booking.plans.${props.intervention.plan}.title`),
  },
  {
    labelKey: 'pro.intervention.household',
    value: weekdaysValue(props.intervention.householdCollectionWeekdays),
  },
  {
    labelKey: 'pro.intervention.recycling',
    value: weekdaysValue(props.intervention.recyclingCollectionWeekdays),
  },
  {
    labelKey: 'pro.intervention.payment',
    value: t(proInterventionView(props.intervention).paymentKey),
  },
  {
    labelKey: 'pro.intervention.amount',
    value: formatPrice(props.intervention.amountTotalCents, locale.value),
  },
])
</script>
