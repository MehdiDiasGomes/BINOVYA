<template>
  <div class="space-y-5">
    <ProRadioCards
      v-model="mode"
      :name="`${PRO_CREATE_ID_PREFIX}-mode`"
      :legend="$t('pro.create.mode.legend')"
      :options="modeOptions"
    />

    <dl
      class="flex items-baseline justify-between gap-3 rounded-xl border border-border bg-paper-2 px-4 py-3"
    >
      <dt class="text-sm font-bold text-ink">{{ priceLabel }}</dt>
      <dd class="text-right text-lg font-black tabular-nums text-ink">{{ priceText }}</dd>
    </dl>

    <div>
      <label :for="PRO_CREATE_FIELD_IDS.note" class="block">
        <span class="mb-1.5 block text-sm font-bold text-ink">
          {{ $t('pro.create.note.label') }}
        </span>
        <textarea
          :id="PRO_CREATE_FIELD_IDS.note"
          v-model="draft.note"
          rows="3"
          :maxlength="PRO_ADMIN_NOTE_MAX_LENGTH"
          :aria-invalid="props.noteError ? 'true' : undefined"
          :aria-describedby="noteDescribedBy"
          :class="FIELD_TEXTAREA_CLASS"
        />
      </label>
      <span :id="`${PRO_CREATE_FIELD_IDS.note}-hint`" :class="FIELD_HINT_CLASS">
        {{ noteHint }}
      </span>
      <span
        v-if="props.noteError"
        :id="`${PRO_CREATE_FIELD_IDS.note}-error`"
        role="alert"
        :class="FIELD_ERROR_CLASS"
      >
        <Icon name="CircleAlert" :size="14" aria-hidden="true" />
        {{ props.noteError }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProBookingMode, ProCreateDraft, ProRadioOption } from '@/types/proCreate'

import { FIELD_ERROR_CLASS, FIELD_HINT_CLASS, FIELD_TEXTAREA_CLASS } from '@/constants/form'
import {
  PRO_ADMIN_NOTE_MAX_LENGTH,
  PRO_BOOKING_MODES,
  PRO_CREATE_FIELD_IDS,
  PRO_CREATE_ID_PREFIX,
  PRO_PAYMENT_LINK_HOLD_HOURS,
} from '@/constants/proCreate'
import { describedByIds } from '@/utils/field'
import { formatPrice } from '@/utils/pricing'

const props = withDefaults(
  defineProps<{
    priceCents?: number | null
    noteError?: string
  }>(),
  {
    priceCents: null,
    noteError: '',
  },
)

const draft = defineModel<ProCreateDraft>({ required: true })

const { t, locale } = useI18n()

const isBookingMode = (value: string): value is ProBookingMode =>
  (PRO_BOOKING_MODES as string[]).includes(value)

const mode: WritableComputedRef<string> = computed({
  get: (): string => draft.value.mode,
  set: (value: string): void => {
    if (isBookingMode(value)) {
      draft.value.mode = value
    }
  },
})

const modeOptions: ComputedRef<ProRadioOption[]> = computed(() =>
  PRO_BOOKING_MODES.map(
    (value: ProBookingMode): ProRadioOption => ({
      value,
      label: t(`pro.create.mode.${value}.label`),
      hint: t(`pro.create.mode.${value}.hint`, { hours: PRO_PAYMENT_LINK_HOLD_HOURS }),
    }),
  ),
)

const priceLabel: ComputedRef<string> = computed(() =>
  draft.value.priceSource === 'quote'
    ? t('pro.create.price.quoteLabel')
    : t('pro.create.price.label'),
)

const priceText: ComputedRef<string> = computed(() =>
  props.priceCents === null
    ? t('pro.create.price.unknown')
    : formatPrice(props.priceCents, locale.value),
)

const noteHint: ComputedRef<string> = computed(() =>
  t('pro.create.note.hint', { maxLength: PRO_ADMIN_NOTE_MAX_LENGTH }),
)

const noteDescribedBy: ComputedRef<string | undefined> = computed(() =>
  describedByIds(PRO_CREATE_FIELD_IDS.note, noteHint.value, props.noteError),
)
</script>
