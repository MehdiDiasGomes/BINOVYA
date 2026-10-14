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
          class="relative z-10 col-start-2 row-start-2 h-12 min-w-0 bg-transparent px-3 text-[15px] text-ink outline-none placeholder:text-ink/50"
          @input="handleInput"
        />
      </label>
    </div>
    <span v-if="props.hint" :id="`${props.id}-hint`" class="mt-1.5 block text-[13px] text-ink/70">
      {{ props.hint }}
    </span>
    <span
      v-if="props.error"
      :id="`${props.id}-error`"
      class="mt-1.5 flex items-center gap-1.5 text-[13px] font-bold text-destructive"
    >
      <Icon name="CircleAlert" :size="14" aria-hidden="true" />
      {{ props.error }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { CountryCode } from '@/types/booking'

import { INPUT_GROUP_FRAME_CLASS } from '@/constants/booking'

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

const describedBy: ComputedRef<string | undefined> = computed(() => {
  const ids: string[] = []
  if (props.hint) {
    ids.push(`${props.id}-hint`)
  }
  if (props.error) {
    ids.push(`${props.id}-error`)
  }
  return ids.length > 0 ? ids.join(' ') : undefined
})

const handleInput = (event: Event): void => {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>
