<template>
  <MediaCard
    :title="customerName"
    :subtitle="props.intervention.address"
    :title-tag="props.titleTag"
    :tone="view.tone"
  >
    <template #eyebrow>
      <Icon :name="view.icon" :size="16" :stroke-width="2.5" aria-hidden="true" class="shrink-0" />
      <p>{{ $t(view.statusKey) }}</p>
    </template>

    <div class="flex flex-1 flex-col">
      <dl v-if="hasVisibleRows" class="grid gap-2 text-[15px]">
        <div
          v-if="props.showDate"
          class="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3"
        >
          <dt class="text-white/80">{{ $t('pro.intervention.date') }}</dt>
          <dd class="font-semibold sm:text-right">{{ dateLabel }}</dd>
        </div>
        <div
          v-if="props.intervention.customer?.phone"
          class="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3"
        >
          <dt class="text-white/80">{{ $t('pro.intervention.phone') }}</dt>
          <dd class="font-semibold sm:text-right">
            <a
              :href="telHref(props.intervention.customer.phone)"
              class="inline-flex min-h-11 items-center gap-2 rounded-sm text-white underline underline-offset-4 transition-colors duration-press ease-brand hover:text-cyan-300 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-turquoise focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900"
            >
              <Icon name="Phone" :size="16" aria-hidden="true" />
              {{ props.intervention.customer.phone }}
            </a>
          </dd>
        </div>
      </dl>
      <div
        :id="detailsId"
        :inert="isCollapsed"
        :aria-hidden="isCollapsed || undefined"
        :class="
          cn(
            'grid grid-rows-[1fr] transition-[grid-template-rows] duration-lift ease-brand motion-reduce:transition-none sm:flex-1',
            !isExpanded && 'max-sm:grid-rows-[0fr]',
          )
        "
      >
        <div
          :class="
            cn(
              'flex min-h-0 flex-col overflow-hidden transition-opacity duration-lift ease-brand motion-reduce:transition-none',
              !isExpanded && 'max-sm:opacity-0',
            )
          "
        >
          <div class="flex flex-1 flex-col gap-4.5 pt-2">
            <dl class="grid gap-2 text-[15px]">
              <div
                v-for="row in rows"
                :key="row.labelKey"
                class="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3"
              >
                <dt class="text-white/80">{{ $t(row.labelKey) }}</dt>
                <dd class="break-words font-semibold sm:text-right">{{ row.value }}</dd>
              </div>
            </dl>
            <dl
              class="mt-auto flex items-baseline justify-between gap-3 border-t border-white/15 pt-3.5 text-sm text-white/80"
            >
              <dt>{{ $t('pro.intervention.amount') }}</dt>
              <dd class="font-heading text-lg font-bold tabular-nums text-white">
                {{ formatPrice(props.intervention.amountTotalCents, locale) }}
              </dd>
            </dl>
          </div>
        </div>
      </div>
      <button
        type="button"
        :aria-expanded="isExpanded"
        :aria-controls="detailsId"
        class="mt-4.5 inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-white/40 bg-white/10 px-4 text-sm font-bold text-white transition-colors duration-press ease-brand hover:border-white/70 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-turquoise focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900 motion-reduce:transition-none sm:hidden"
        @click="isExpanded = !isExpanded"
      >
        <Icon
          name="ChevronDown"
          :size="16"
          aria-hidden="true"
          :class="
            cn(
              'shrink-0 transition-[rotate] duration-press ease-brand motion-reduce:transition-none',
              isExpanded && 'rotate-180',
            )
          "
        />
        {{ isExpanded ? $t('pro.intervention.showLess') : $t('pro.intervention.showMore') }}
        <span class="sr-only">
          {{ $t('pro.intervention.toggleContext', { name: customerName }) }}
        </span>
      </button>
    </div>

    <template #action>
      <a
        :href="mapsUrl"
        target="_blank"
        rel="noopener noreferrer"
        :class="cn(MEDIA_CARD_ACTION_CLASS, 'flex items-center justify-center gap-2.5')"
      >
        <GoogleMapsIcon :size="18" />
        {{ $t('pro.intervention.directions') }}
        <span class="sr-only">
          {{ $t('pro.intervention.directionsContext', { address: props.intervention.address }) }}
        </span>
      </a>
    </template>
  </MediaCard>
</template>

<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'

import type { AccountDetailRow } from '@/types/account'
import type { MediaCardTitleTag } from '@/types/mediaCard'
import type { ProIntervention, ProInterventionView } from '@/types/pro'

import { MEDIA_CARD_ACTION_CLASS } from '@/constants/mediaCard'
import { PRO_CARD_EXPANDED_MIN_WIDTH, PRO_CARD_EXPANDED_QUERY } from '@/constants/pro'
import { cn } from '@/lib/utils'
import { bookingDateLabel, bookingServicesLabel } from '@/utils/accountBookingCard'
import { directionsUrl } from '@/utils/googleMaps'
import { telHref } from '@/utils/phone'
import { formatPrice } from '@/utils/pricing'
import {
  collectionWeekdaysLabel,
  proCustomerName,
  proInterventionView,
} from '@/utils/proIntervention'

const props = withDefaults(
  defineProps<{
    intervention: ProIntervention
    titleTag?: MediaCardTitleTag
    showDate?: boolean
  }>(),
  {
    titleTag: 'h3',
    showDate: false,
  },
)

const { t, locale } = useI18n()

const view: ComputedRef<ProInterventionView> = computed(() =>
  proInterventionView(props.intervention),
)

const customerName: ComputedRef<string> = computed(() =>
  proCustomerName(props.intervention.customer, t),
)

const dateLabel: ComputedRef<string> = computed(() =>
  bookingDateLabel(props.intervention.scheduledDate, locale.value),
)

const isWide: Readonly<Ref<boolean>> = useMediaQuery(PRO_CARD_EXPANDED_QUERY, {
  ssrWidth: PRO_CARD_EXPANDED_MIN_WIDTH,
})

const isExpanded: Ref<boolean> = ref(false)

const isCollapsed: ComputedRef<boolean> = computed(() => !isExpanded.value && !isWide.value)

const detailsId: ComputedRef<string> = computed(
  () => `pro-intervention-details-${props.intervention.id}`,
)

const hasVisibleRows: ComputedRef<boolean> = computed(
  () => props.showDate || Boolean(props.intervention.customer?.phone),
)

const mapsUrl: ComputedRef<string> = computed(() => directionsUrl(props.intervention))

const weekdaysValue = (weekdays: number[]): string =>
  collectionWeekdaysLabel(weekdays, locale.value) || t('pro.intervention.unknownDays')

const rows: ComputedRef<AccountDetailRow[]> = computed(() => [
  { labelKey: 'pro.intervention.bins', value: bookingServicesLabel(props.intervention, t) },
  {
    labelKey: 'pro.intervention.plan',
    value: t(`booking.plans.${props.intervention.plan}.title`),
  },
  { labelKey: 'pro.intervention.payment', value: t(view.value.paymentKey) },
  {
    labelKey: 'pro.intervention.household',
    value: weekdaysValue(props.intervention.householdCollectionWeekdays),
  },
  {
    labelKey: 'pro.intervention.recycling',
    value: weekdaysValue(props.intervention.recyclingCollectionWeekdays),
  },
])
</script>
