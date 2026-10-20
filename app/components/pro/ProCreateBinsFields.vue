<template>
  <div class="space-y-8">
    <div class="space-y-5">
      <ProRadioCards
        v-model="priceSource"
        :name="`${PRO_CREATE_ID_PREFIX}-price-source`"
        :legend="$t('pro.create.priceSource.legend')"
        :options="priceSourceOptions"
      />
      <BookingField
        v-if="draft.priceSource === 'quote'"
        :id="PRO_CREATE_FIELD_IDS.quoteAmount"
        v-model="draft.quoteAmount"
        :label="$t('pro.create.quoteAmount.label')"
        :hint="$t('pro.create.quoteAmount.hint')"
        :error="props.quoteAmountError"
        input-mode="decimal"
      />
    </div>

    <fieldset :id="PRO_CREATE_FIELD_IDS.bins" :aria-describedby="binsDescribedBy">
      <legend class="text-base font-black text-ink">{{ $t('pro.create.bins.legend') }}</legend>
      <p :id="`${PRO_CREATE_FIELD_IDS.bins}-hint`" :class="FIELD_HINT_CLASS">
        {{ binsHint }}
      </p>
      <p class="sr-only" role="status">{{ binsStatus }}</p>
      <ul role="list" class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <li
          v-for="service in BOOKING_SERVICES"
          :key="service.slug"
          class="flex items-center justify-between gap-3 rounded-xl border border-border bg-paper-2/50 p-3 sm:p-4"
        >
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <NuxtImg
              :src="service.image"
              alt=""
              width="56"
              height="56"
              loading="lazy"
              class="size-12 shrink-0 object-contain sm:size-14"
            />
            <div class="min-w-0">
              <p :id="binLabelId(service.slug)" class="break-words text-sm font-black text-ink">
                {{ $t(service.titleKey) }}
              </p>
              <p class="break-words text-[13px] text-ink/70">{{ $t(service.capacityKey) }}</p>
            </div>
          </div>
          <ProBinCountField
            :id="binFieldId(service.slug)"
            :labelled-by="binLabelId(service.slug)"
            :max="maxBins"
            :service-name="$t(service.titleKey)"
            :model-value="countOf(service.slug)"
            @update:model-value="setCount(service.slug, $event)"
            @clamped="announceTypedClamp($t(service.titleKey), $event)"
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
import type {
  ProBinCounts,
  ProCreateDraft,
  ProPriceSource,
  ProRadioOption,
} from '@/types/proCreate'

import { BOOKING_SERVICES } from '@/constants/booking'
import { FIELD_ERROR_CLASS, FIELD_HINT_CLASS } from '@/constants/form'
import {
  PRO_CREATE_FIELD_IDS,
  PRO_CREATE_ID_PREFIX,
  PRO_MAX_BINS_PER_SERVICE,
  PRO_PRICE_SOURCES,
  PRO_QUOTE_MAX_BINS_PER_SERVICE,
} from '@/constants/proCreate'
import { describedByIds } from '@/utils/field'

const props = withDefaults(
  defineProps<{
    binsError?: string
    quoteAmountError?: string
    priceFor?: (plan: BookingPlan) => number | null
    hasGridError?: boolean
  }>(),
  {
    binsError: '',
    quoteAmountError: '',
    priceFor: (): null => null,
    hasGridError: false,
  },
)

const draft = defineModel<ProCreateDraft>({ required: true })

const { t } = useI18n()

const maxBins: ComputedRef<number> = computed(() =>
  draft.value.priceSource === 'quote' ? PRO_QUOTE_MAX_BINS_PER_SERVICE : PRO_MAX_BINS_PER_SERVICE,
)

const quoteCounts: Ref<ProBinCounts | null> = ref(null)

const { message: binsStatus, announce, clear: clearBinsStatus } = useLiveAnnouncement()

const clampCounts = (): void => {
  const { smallBinCount, largeBinCount } = draft.value
  if (smallBinCount <= maxBins.value && largeBinCount <= maxBins.value) {
    return
  }
  quoteCounts.value = { smallBinCount, largeBinCount }
  draft.value.smallBinCount = Math.min(smallBinCount, maxBins.value)
  draft.value.largeBinCount = Math.min(largeBinCount, maxBins.value)
  void announce(t('pro.create.bins.clampedHint', { max: maxBins.value }))
}

const restoreQuoteCounts = (): void => {
  if (quoteCounts.value) {
    draft.value.smallBinCount = quoteCounts.value.smallBinCount
    draft.value.largeBinCount = quoteCounts.value.largeBinCount
    quoteCounts.value = null
    clearBinsStatus()
  }
}

const isPriceSource = (value: string): value is ProPriceSource =>
  (PRO_PRICE_SOURCES as string[]).includes(value)

const priceSource: WritableComputedRef<string> = computed({
  get: (): string => draft.value.priceSource,
  set: (value: string): void => {
    if (isPriceSource(value)) {
      draft.value.priceSource = value
      if (value === 'quote') {
        restoreQuoteCounts()
      } else {
        clampCounts()
      }
    }
  },
})

const priceSourceOptions: ComputedRef<ProRadioOption[]> = computed(() =>
  PRO_PRICE_SOURCES.map(
    (value: ProPriceSource): ProRadioOption => ({
      value,
      label: t(`pro.create.priceSource.${value}.label`),
      hint: t(`pro.create.priceSource.${value}.hint`),
    }),
  ),
)

const binsHint: ComputedRef<string> = computed(() => {
  if (draft.value.priceSource === 'quote') {
    return t('pro.create.bins.quoteHint', { max: maxBins.value })
  }
  const hint: string = t('pro.create.bins.hint', { max: maxBins.value })
  return quoteCounts.value
    ? `${hint} ${t('pro.create.bins.clampedHint', { max: maxBins.value })}`
    : hint
})

const binsDescribedBy: ComputedRef<string | undefined> = computed(() =>
  describedByIds(PRO_CREATE_FIELD_IDS.bins, binsHint.value, props.binsError),
)

const countOf = (slug: ServiceSlug): number =>
  slug === 'small-bin' ? draft.value.smallBinCount : draft.value.largeBinCount

const binFieldId = (slug: ServiceSlug): string => `${PRO_CREATE_FIELD_IDS.bins}-${slug}`

const binLabelId = (slug: ServiceSlug): string => `${binFieldId(slug)}-label`

const announceTypedClamp = async (service: string, max: number): Promise<void> => {
  await announce(t('pro.create.bins.typedClamped', { service, max }))
}

const setCount = (slug: ServiceSlug, count: number): void => {
  quoteCounts.value = null
  clearBinsStatus()
  if (slug === 'small-bin') {
    draft.value.smallBinCount = count
  } else {
    draft.value.largeBinCount = count
  }
}
</script>
