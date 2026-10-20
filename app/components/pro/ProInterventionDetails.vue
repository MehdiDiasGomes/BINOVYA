<template>
  <section :aria-labelledby="titleId" class="rounded-2xl border border-border bg-white shadow-sm">
    <h2 :id="titleId" class="text-lg font-black text-ink">
      <button
        type="button"
        :aria-expanded="isOpen"
        :aria-controls="contentId"
        class="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-5 py-3 text-left transition-colors duration-press ease-brand hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none"
        @click="isOpen = !isOpen"
      >
        {{ $t('pro.steps.details.toggle') }}
        <Icon
          name="ChevronDown"
          :size="20"
          aria-hidden="true"
          :class="
            cn(
              'shrink-0 transition-[rotate] duration-press ease-brand motion-reduce:transition-none',
              isOpen && 'rotate-180',
            )
          "
        />
      </button>
    </h2>
    <div :id="contentId">
      <Transition
        :enter-active-class="ACCORDION_ENTER_ACTIVE_CLASS"
        enter-from-class="grid-rows-[0fr] opacity-0"
        enter-to-class="grid-rows-[1fr] opacity-100"
        :leave-active-class="ACCORDION_LEAVE_ACTIVE_CLASS"
        leave-from-class="grid-rows-[1fr] opacity-100"
        leave-to-class="grid-rows-[0fr] opacity-0"
      >
        <div v-if="isOpen" class="grid">
          <div class="min-h-0 overflow-hidden">
            <dl class="grid gap-2 px-5 pb-5 pt-1.5 text-[15px]">
              <div v-if="phone" :class="DETAIL_ROW_CLASS">
                <dt class="text-ink/80">{{ $t('pro.intervention.phone') }}</dt>
                <dd class="font-semibold sm:text-right">
                  <a :href="telHref(phone)" :class="TEXT_LINK_CLASS">
                    <Icon name="Phone" :size="16" aria-hidden="true" />
                    {{ groupPhoneDigits(phone) }}
                  </a>
                </dd>
              </div>
              <div v-for="row in rows" :key="row.labelKey" :class="DETAIL_ROW_CLASS">
                <dt class="text-ink/80">{{ $t(row.labelKey) }}</dt>
                <dd class="break-words font-semibold sm:text-right">{{ row.value }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </Transition>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { AccountDetailRow } from '@/types/account'
import type { ProIntervention } from '@/types/pro'

import { TEXT_LINK_CLASS } from '@/constants/buttons'
import { DETAIL_ROW_CLASS } from '@/constants/mediaCard'
import { ACCORDION_ENTER_ACTIVE_CLASS, ACCORDION_LEAVE_ACTIVE_CLASS } from '@/constants/motion'
import { cn } from '@/lib/utils'
import { bookingDateLabel, bookingServicesLabel } from '@/utils/accountBookingCard'
import { groupPhoneDigits, telHref } from '@/utils/phone'
import { formatPrice } from '@/utils/pricing'
import { collectionWeekdaysLabel, proInterventionView } from '@/utils/proIntervention'

const props = defineProps<{
  intervention: ProIntervention
}>()

const { t, locale } = useI18n()

const titleId: string = useId()

const contentId: string = useId()

const isOpen: Ref<boolean> = ref(false)

const phone: ComputedRef<string> = computed(() => props.intervention.customer?.phone ?? '')

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
    labelKey: 'pro.intervention.amount',
    value: formatPrice(props.intervention.amountTotalCents, locale.value),
  },
  {
    labelKey: 'pro.intervention.payment',
    value: t(proInterventionView(props.intervention).paymentKey),
  },
])

watch(
  (): string => props.intervention.id,
  (): void => {
    isOpen.value = false
  },
)
</script>
