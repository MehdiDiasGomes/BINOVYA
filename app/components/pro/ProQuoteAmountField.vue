<template>
  <div>
    <span :id="labelId" class="mb-1.5 block text-sm font-bold text-ink">{{ props.label }}</span>
    <NumberField
      :id="props.id"
      :aria-labelledby="labelId"
      :model-value="props.modelValue"
      :min="PRO_QUOTE_MIN_EUROS"
      :max="PRO_QUOTE_MAX_EUROS"
      :step="PRO_QUOTE_STEP_EUROS"
      :step-snapping="false"
      :format-options="EURO_AMOUNT_FORMAT"
      :locale="locale"
      class="w-full"
      disable-wheel-change
      @update:model-value="update"
    >
      <NumberFieldContent>
        <NumberFieldDecrement
          :aria-label="$t('pro.create.quoteAmount.decrease')"
          :class="NUMBER_FIELD_STEP_BUTTON_CLASS"
        />
        <NumberFieldInput
          :aria-labelledby="labelId"
          :aria-invalid="props.error ? 'true' : undefined"
          :aria-describedby="describedBy"
          :aria-roledescription="undefined"
          :class="cn(FIELD_INPUT_CLASS, 'px-12 text-center text-lg font-black tabular-nums')"
          required
          @input="commitTypedText"
          @compositionend="commitTypedText"
        />
        <NumberFieldIncrement
          :aria-label="$t('pro.create.quoteAmount.increase')"
          :class="NUMBER_FIELD_STEP_BUTTON_CLASS"
        />
      </NumberFieldContent>
    </NumberField>
    <span v-if="props.hint" :id="`${props.id}-hint`" :class="FIELD_HINT_CLASS">
      {{ props.hint }}
    </span>
    <span v-if="props.error" :id="`${props.id}-error`" role="alert" :class="FIELD_ERROR_CLASS">
      <Icon name="CircleAlert" :size="14" aria-hidden="true" />
      {{ props.error }}
    </span>
    <p class="sr-only" role="status">{{ clampStatus }}</p>
  </div>
</template>

<script setup lang="ts">
import { NumberParser } from '@internationalized/number'

import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@/components/ui/number-field'
import {
  EURO_AMOUNT_FORMAT,
  FIELD_ERROR_CLASS,
  FIELD_HINT_CLASS,
  FIELD_INPUT_CLASS,
  NUMBER_FIELD_STEP_BUTTON_CLASS,
} from '@/constants/form'
import {
  CENTS_PER_EURO,
  PRO_QUOTE_MAX_EUROS,
  PRO_QUOTE_MIN_EUROS,
  PRO_QUOTE_STEP_EUROS,
} from '@/constants/proCreate'
import { cn } from '@/lib/utils'
import { describedByIds, replaceInputText } from '@/utils/field'

const props = withDefaults(
  defineProps<{
    id: string
    label: string
    modelValue?: number | null
    hint?: string
    error?: string
  }>(),
  {
    modelValue: null,
    hint: '',
    error: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const { t, locale } = useI18n()

const { message: clampStatus, announce } = useLiveAnnouncement()

const labelId: ComputedRef<string> = computed(() => `${props.id}-label`)

const describedBy: ComputedRef<string | undefined> = computed(() =>
  describedByIds(props.id, props.hint, props.error),
)

const amountParser: ComputedRef<NumberParser> = computed(
  () => new NumberParser(locale.value, EURO_AMOUNT_FORMAT),
)

const amountFormatter: ComputedRef<Intl.NumberFormat> = computed(
  () => new Intl.NumberFormat(locale.value, EURO_AMOUNT_FORMAT),
)

const roundToCents = (euros: number): number => Math.round(euros * CENTS_PER_EURO) / CENTS_PER_EURO

const keepTypedText = async (input: HTMLInputElement, text: string): Promise<void> => {
  const start: number | null = input.selectionStart
  const end: number | null = input.selectionEnd
  await nextTick()
  if (input.value !== text) {
    replaceInputText(input, text)
    input.setSelectionRange(start, end)
  }
}

const announceClamp = async (input: HTMLInputElement): Promise<void> => {
  const max: string = amountFormatter.value.format(PRO_QUOTE_MAX_EUROS)
  replaceInputText(input, max)
  await announce(t('pro.create.quoteAmount.clamped', { max }))
}

/**
 * Commits the typed amount while typing, parsed and clamped like reka does on blur, so the blur
 * caused by pressing a button below never removes the error shown above it. reka rewrites the
 * text with the currency format as soon as the value changes: the typed text and caret are put
 * back after the render. An amount above the maximum is replaced by the maximum and announced.
 * @param event - Input or composition end event of the number field
 */
const commitTypedText = async (event: Event): Promise<void> => {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  if (event instanceof InputEvent && event.isComposing) {
    return
  }
  const input: HTMLInputElement = event.target
  const text: string = input.value
  const parsed: number = text.trim() === '' ? Number.NaN : amountParser.value.parse(text)
  if (text.trim() !== '' && Number.isNaN(parsed)) {
    return
  }
  const value: number | null = Number.isNaN(parsed)
    ? null
    : roundToCents(Math.min(PRO_QUOTE_MAX_EUROS, Math.max(PRO_QUOTE_MIN_EUROS, parsed)))
  if (value !== props.modelValue) {
    emit('update:modelValue', value)
  }
  if (value !== null && parsed > PRO_QUOTE_MAX_EUROS) {
    await announceClamp(input)
    return
  }
  await keepTypedText(input, text)
}

/**
 * Forwards an amount applied by reka (blur, Enter, step, Home/End) only when it changes the model,
 * reka emitting on every blur.
 * @param value - Amount applied by reka, undefined or NaN once cleared
 */
const update = (value: number | undefined): void => {
  const next: number | null = value === undefined || Number.isNaN(value) ? null : value
  if (next !== props.modelValue) {
    emit('update:modelValue', next)
  }
}
</script>
