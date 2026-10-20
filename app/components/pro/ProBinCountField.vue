<template>
  <NumberField
    :id="props.id"
    :model-value="props.modelValue"
    :min="0"
    :max="props.max"
    :step="1"
    :format-options="WHOLE_NUMBER_FORMAT"
    :locale="locale"
    class="w-full"
    disable-wheel-change
    @update:model-value="update"
  >
    <NumberFieldContent>
      <NumberFieldDecrement
        :aria-label="$t('booking.bins.decrease', { service: props.serviceName })"
        :class="NUMBER_FIELD_STEP_BUTTON_CLASS"
      />
      <NumberFieldInput
        :aria-labelledby="props.labelledBy"
        :aria-roledescription="undefined"
        :class="cn(FIELD_INPUT_CLASS, 'px-12 text-center text-lg font-black tabular-nums')"
        @input="commitTypedText"
        @compositionend="commitTypedText"
      />
      <NumberFieldIncrement
        :aria-label="$t('booking.bins.increase', { service: props.serviceName })"
        :class="NUMBER_FIELD_STEP_BUTTON_CLASS"
      />
    </NumberFieldContent>
  </NumberField>
</template>

<script setup lang="ts">
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@/components/ui/number-field'
import {
  DIGITS_PATTERN,
  FIELD_INPUT_CLASS,
  NUMBER_FIELD_STEP_BUTTON_CLASS,
  WHOLE_NUMBER_FORMAT,
} from '@/constants/form'
import { cn } from '@/lib/utils'
import { replaceInputText } from '@/utils/field'

const props = withDefaults(
  defineProps<{
    id: string
    labelledBy: string
    max: number
    serviceName?: string
    modelValue?: number
  }>(),
  {
    serviceName: '',
    modelValue: 0,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
  clamped: [value: number]
}>()

const { locale } = useI18n()

const clampCount = (value: number): number => Math.min(props.max, Math.max(0, value))

/**
 * Commits the typed count as soon as it is a whole number, so the blur caused by pressing a step
 * button never changes the content above it (see `ProCapacityField`). A count above the maximum is
 * replaced by the maximum at once and reported through `clamped`. An empty field waits for the
 * blur, where it becomes 0.
 * @param event - Input or composition end event of the number field
 */
const commitTypedText = (event: Event): void => {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  if (event instanceof InputEvent && event.isComposing) {
    return
  }
  const text: string = event.target.value.trim()
  if (!DIGITS_PATTERN.test(text)) {
    return
  }
  const typed: number = Number(text)
  const value: number = clampCount(typed)
  if (value !== typed) {
    emit('clamped', value)
    replaceInputText(event.target, String(value))
    return
  }
  if (value !== props.modelValue) {
    emit('update:modelValue', value)
  }
}

/**
 * Forwards a count applied by reka (blur, Enter, step, Home/End), an emptied field giving 0. When
 * the count is unchanged, the shown text is written back after reka has finished, since reka
 * leaves an emptied field empty and no re-render would replace it.
 * @param value - Count applied by reka, undefined or NaN once cleared
 */
const update = async (value: number | undefined): Promise<void> => {
  const next: number = value === undefined || Number.isNaN(value) ? 0 : clampCount(value)
  if (next !== props.modelValue) {
    emit('update:modelValue', next)
    return
  }
  await nextTick()
  const input: HTMLElement | null = document.getElementById(props.id)
  if (input instanceof HTMLInputElement) {
    replaceInputText(input, String(next))
  }
}
</script>
