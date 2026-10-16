<template>
  <div>
    <div class="group grid grid-cols-[auto_minmax(0,1fr)]">
      <span aria-hidden="true" :class="INPUT_GROUP_FRAME_CLASS" />
      <BookingCountrySelect
        :id="`${props.id}-country`"
        :model-value="props.countryCode"
        :label="props.countryLabel"
        with-dial-code
        class="col-start-1 row-start-2"
        @update:model-value="emit('update:countryCode', $event)"
      />
      <label :for="props.id" class="contents">
        <span class="col-span-2 row-start-1 mb-1.5 block text-sm font-bold text-ink">
          {{ props.label }}
        </span>
        <input
          :id="props.id"
          :value="props.modelValue"
          type="tel"
          autocomplete="tel-national"
          :placeholder="props.placeholder"
          :aria-invalid="props.error ? 'true' : undefined"
          :aria-describedby="describedBy"
          required
          class="relative z-10 col-start-2 row-start-2 h-12 min-w-0 bg-transparent px-3 text-[15px] text-ink outline-none placeholder:text-ink/60"
          @input="handleInput"
        />
      </label>
    </div>
    <span v-if="props.hint" :id="`${props.id}-hint`" class="mt-1.5 block text-[13px] text-ink/70">
      {{ props.hint }}
    </span>
    <span v-if="props.error" :id="`${props.id}-error`" role="alert" :class="FIELD_ERROR_CLASS">
      <Icon name="CircleAlert" :size="14" aria-hidden="true" />
      {{ props.error }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { CountryCode } from '@/types/booking'

import { FIELD_ERROR_CLASS, INPUT_GROUP_FRAME_CLASS } from '@/constants/booking'
import { describedByIds } from '@/utils/field'

const props = withDefaults(
  defineProps<{
    id: string
    label: string
    countryLabel: string
    modelValue?: string
    countryCode?: CountryCode
    placeholder?: string
    hint?: string
    error?: string
  }>(),
  {
    modelValue: '',
    countryCode: 'FR',
    placeholder: '',
    hint: '',
    error: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:countryCode': [value: CountryCode]
}>()

const describedBy: ComputedRef<string | undefined> = computed(() =>
  describedByIds(props.id, props.hint, props.error),
)

const handleInput = (event: Event): void => {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>
