<template>
  <div>
    <NumberField
      :id="props.id"
      :aria-labelledby="labelId"
      :model-value="props.modelValue"
      :min="props.min"
      :max="props.max"
      :step="1"
      :format-options="CAPACITY_FORMAT"
      :locale="locale"
      disable-wheel-change
      @update:model-value="update"
    >
      <span :id="labelId" class="text-sm font-bold text-ink">{{ props.label }}</span>
      <NumberFieldContent
        @keydown.capture="handleKeydownCapture"
        @pointerdown.capture="handlePointerdownCapture"
      >
        <NumberFieldDecrement
          :aria-label="
            $t('pro.availability.capacityField.decrease', { context: props.contextLabel })
          "
          :class="CAPACITY_STEP_BUTTON_CLASS"
        />
        <NumberFieldInput
          :aria-labelledby="labelId"
          :aria-invalid="props.error ? 'true' : undefined"
          :aria-describedby="describedBy"
          :aria-roledescription="undefined"
          :placeholder="rulePlaceholder"
          :class="cn(FIELD_INPUT_CLASS, 'px-12 text-center tabular-nums')"
          @input="commitTypedText"
          @compositionend="commitTypedText"
        />
        <NumberFieldIncrement
          :aria-label="
            $t('pro.availability.capacityField.increase', { context: props.contextLabel })
          "
          :class="CAPACITY_STEP_BUTTON_CLASS"
        />
      </NumberFieldContent>
    </NumberField>
    <span v-if="hasHint" :id="`${props.id}-hint`" :class="cn(FIELD_HINT_CLASS, 'text-pretty')">
      <span v-if="isClosed" class="block font-bold">
        {{ $t('pro.availability.capacityField.closed') }}
      </span>
      <span v-if="props.hint" class="block">{{ props.hint }}</span>
    </span>
    <AnimatePresence :initial="false">
      <Motion
        v-if="canFollowRule"
        key="follow-rule"
        as="div"
        :initial="{ opacity: 0, y: STEP_OFFSET / 2 }"
        :animate="{ opacity: 1, y: 0 }"
        :exit="{ opacity: 0 }"
        :transition="STEP_TRANSITION"
        class="mt-2"
      >
        <AppButton
          variant="secondary"
          size="sm"
          class="w-full px-3 text-[13px] sm:w-auto"
          @click="followRule"
        >
          {{ $t('pro.availability.capacityField.followRule') }}
        </AppButton>
      </Motion>
    </AnimatePresence>
    <span v-if="props.error" :id="`${props.id}-error`" role="alert" :class="FIELD_ERROR_CLASS">
      <Icon name="CircleAlert" :size="14" aria-hidden="true" />
      {{ props.error }}
    </span>
  </div>
</template>

<script setup lang="ts">
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@/components/ui/number-field'
import { FIELD_ERROR_CLASS, FIELD_HINT_CLASS, FIELD_INPUT_CLASS } from '@/constants/booking'
import { STEP_OFFSET, STEP_TRANSITION } from '@/constants/motion'
import { PRO_DAY_CAPACITY_MAX } from '@/constants/pro'
import { cn } from '@/lib/utils'
import { describedByIds } from '@/utils/field'
import { focusFirstElement } from '@/utils/focus'

const props = withDefaults(
  defineProps<{
    id: string
    label: string
    modelValue?: number | null
    min?: number
    max?: number
    contextLabel?: string
    hint?: string
    error?: string
    isNullable?: boolean
    fallbackValue?: number
  }>(),
  {
    modelValue: null,
    min: 0,
    max: PRO_DAY_CAPACITY_MAX,
    contextLabel: '',
    hint: '',
    error: '',
    isNullable: false,
    fallbackValue: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const CAPACITY_FORMAT: Intl.NumberFormatOptions = { maximumFractionDigits: 0, useGrouping: false }

const CAPACITY_STEP_BUTTON_CLASS: string =
  'mx-0.5 flex size-11 cursor-pointer items-center justify-center rounded-md p-0 text-ink transition-colors duration-press ease-brand hover:bg-primary/10 hover:text-primary active:bg-primary/20 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-ink/40 disabled:opacity-100 motion-reduce:transition-none'

const FALLBACK_KEY_STEPS: Record<string, number> = {
  ArrowUp: 1,
  ArrowDown: -1,
  PageUp: 10,
  PageDown: -10,
}

const STEP_BUTTON_DELTAS: Record<string, number> = { increment: 1, decrement: -1 }

const STEP_BUTTON_SELECTOR: string = '[data-slot="increment"], [data-slot="decrement"]'

const DIGITS_PATTERN: RegExp = /^\d+$/

const { t, locale } = useI18n()

const labelId: ComputedRef<string> = computed(() => `${props.id}-label`)

const isClosed: ComputedRef<boolean> = computed(() => props.modelValue === 0)

const canFollowRule: ComputedRef<boolean> = computed(
  () => props.isNullable && props.modelValue !== null,
)

const closedLabel: ComputedRef<string> = computed(() =>
  isClosed.value ? t('pro.availability.capacityField.closed') : '',
)

const rulePlaceholder: ComputedRef<string | undefined> = computed(() =>
  props.fallbackValue === undefined
    ? undefined
    : t('pro.availability.capacityField.rulePlaceholder', { count: props.fallbackValue }),
)

const hasHint: ComputedRef<boolean> = computed(() => isClosed.value || props.hint.length > 0)

const describedBy: ComputedRef<string | undefined> = computed(() =>
  describedByIds(props.id, props.hint || closedLabel.value, props.error),
)

const capacityFormatter: ComputedRef<Intl.NumberFormat> = computed(
  () => new Intl.NumberFormat(locale.value, CAPACITY_FORMAT),
)

const clampCapacity = (value: number): number => Math.min(props.max, Math.max(props.min, value))

const typedCapacity = (text: string): number | null | undefined => {
  if (text === '') {
    return null
  }
  return DIGITS_PATTERN.test(text) ? clampCapacity(Number(text)) : undefined
}

const fieldInput = (): HTMLInputElement | null => {
  const element: HTMLElement | null = document.getElementById(props.id)
  return element instanceof HTMLInputElement ? element : null
}

const emptyFallbackInput = (container: EventTarget | null): HTMLInputElement | null => {
  if (props.fallbackValue === undefined) {
    return null
  }
  const input: HTMLInputElement | null =
    container instanceof HTMLElement ? container.querySelector('input') : null
  return input && input.value.trim() === '' ? input : null
}

const stepFromFallback = (event: Event, delta: number | undefined): void => {
  const input: HTMLInputElement | null = emptyFallbackInput(event.currentTarget)
  if (delta === undefined || !input || props.fallbackValue === undefined) {
    return
  }
  event.preventDefault()
  event.stopPropagation()
  input.focus()
  const next: number = clampCapacity(props.fallbackValue + delta)
  input.value = String(next)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * Commits the typed text as soon as it is a whole number, clamped like reka does on blur, or
 * null once cleared. reka applies typed text only on blur: the blur caused by pressing a button
 * below would then show or hide content above that button (follow-rule button, closed hint,
 * error) and shift it away from the pointer before the click lands, dropping the click.
 * Skipped while an IME composition is running, then applied on `compositionend`.
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
  const value: number | null | undefined = typedCapacity(text)
  if (value !== undefined && value !== props.modelValue) {
    emit('update:modelValue', value)
  }
}

const handleKeydownCapture = (event: KeyboardEvent): void => {
  if (event.target instanceof HTMLInputElement) {
    stepFromFallback(event, FALLBACK_KEY_STEPS[event.key])
  }
}

const handlePointerdownCapture = (event: PointerEvent): void => {
  const button: HTMLElement | null =
    event.target instanceof Element ? event.target.closest(STEP_BUTTON_SELECTOR) : null
  if (event.button === 0 && button && !button.hasAttribute('disabled')) {
    stepFromFallback(event, STEP_BUTTON_DELTAS[button.dataset.slot ?? ''])
  }
}

/**
 * Forwards a value applied by reka (blur, Enter, step, Home/End) only when it changes the model:
 * reka emits on every blur, and a repeated emit would clear errors or feedback shown by the
 * parent. When the value is unchanged, typed text that reka clamped to the current model (« 500 »
 * at the maximum, then a step) is written back, since no re-render would replace it.
 * @param value - Value applied by reka, undefined or NaN once cleared
 */
const update = (value: number | undefined): void => {
  const next: number | null = value === undefined || Number.isNaN(value) ? null : value
  if (next !== props.modelValue) {
    emit('update:modelValue', next)
    return
  }
  const input: HTMLInputElement | null = fieldInput()
  const text: string = next === null ? '' : capacityFormatter.value.format(next)
  if (input && input.value !== text) {
    input.value = text
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

const followRule = async (): Promise<void> => {
  emit('update:modelValue', null)
  await nextTick()
  focusFirstElement([props.id])
}
</script>
