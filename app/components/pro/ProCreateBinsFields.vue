<template>
  <div class="space-y-8">
    <fieldset :id="PRO_CREATE_FIELD_IDS.bins" :aria-describedby="binsDescribedBy">
      <legend class="text-base font-black text-ink">{{ $t('pro.create.bins.legend') }}</legend>
      <p :id="`${PRO_CREATE_FIELD_IDS.bins}-hint`" :class="FIELD_HINT_CLASS">
        {{ $t('pro.create.bins.hint', { max: PRO_MAX_BINS_PER_SERVICE }) }}
      </p>
      <ul role="list" class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <li
          v-for="service in BOOKING_SERVICES"
          :key="service.slug"
          class="flex items-center justify-between gap-3 rounded-xl border border-border bg-paper-2/50 p-4"
        >
          <div class="min-w-0">
            <p class="break-words text-sm font-black text-ink">{{ $t(service.titleKey) }}</p>
            <p class="break-words text-[13px] text-ink/70">{{ $t(service.capacityKey) }}</p>
          </div>
          <BookingQuantityStepper
            :model-value="countOf(service.slug)"
            :service-name="$t(service.titleKey)"
            :max="PRO_MAX_BINS_PER_SERVICE"
            @update:model-value="setCount(service.slug, $event)"
          />
        </li>
      </ul>
      <p
        v-if="props.binsError"
        :id="`${PRO_CREATE_FIELD_IDS.bins}-error`"
        role="alert"
        :class="FIELD_ERROR_CLASS"
      >
        <Icon name="CircleAlert" :size="14" aria-hidden="true" />
        {{ props.binsError }}
      </p>
    </fieldset>

    <BookingPlanOptions
      v-model="draft.plan"
      :price-for="props.priceFor"
      :has-grid-error="props.hasGridError"
    />

    <div class="space-y-6">
      <BookingCollectionField v-model="draft.household" kind="household" />
      <BookingCollectionField v-model="draft.recycling" kind="recycling" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BookingPlan, ServiceSlug } from '@/types/booking'
import type { ProCreateDraft } from '@/types/proCreate'

import { BOOKING_SERVICES } from '@/constants/booking'
import { FIELD_ERROR_CLASS, FIELD_HINT_CLASS } from '@/constants/form'
import { PRO_CREATE_FIELD_IDS, PRO_MAX_BINS_PER_SERVICE } from '@/constants/proCreate'
import { describedByIds } from '@/utils/field'

const props = withDefaults(
  defineProps<{
    binsError?: string
    priceFor?: (plan: BookingPlan) => number | null
    hasGridError?: boolean
  }>(),
  {
    binsError: '',
    priceFor: (): null => null,
    hasGridError: false,
  },
)

const draft = defineModel<ProCreateDraft>({ required: true })

const { t } = useI18n()

const binsDescribedBy: ComputedRef<string | undefined> = computed(() =>
  describedByIds(
    PRO_CREATE_FIELD_IDS.bins,
    t('pro.create.bins.hint', { max: PRO_MAX_BINS_PER_SERVICE }),
    props.binsError,
  ),
)

const countOf = (slug: ServiceSlug): number =>
  slug === 'small-bin' ? draft.value.smallBinCount : draft.value.largeBinCount

const setCount = (slug: ServiceSlug, count: number): void => {
  if (slug === 'small-bin') {
    draft.value.smallBinCount = count
  } else {
    draft.value.largeBinCount = count
  }
}
</script>
