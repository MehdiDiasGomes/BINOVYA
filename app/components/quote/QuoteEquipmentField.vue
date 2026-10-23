<template>
  <fieldset :id="props.id" :aria-describedby="props.error ? `${props.id}-error` : undefined">
    <legend class="text-lg font-black text-ink">{{ $t('quote.equipment.legend') }}</legend>
    <p class="mt-1 text-sm text-ink/70">{{ $t('quote.equipment.description') }}</p>

    <div class="mt-4 grid gap-2 sm:grid-cols-2">
      <label
        v-for="item in QUOTE_EQUIPMENT"
        :key="item"
        :for="`${props.id}-${item}`"
        class="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-ink/50 bg-white px-4 py-2 text-sm font-bold text-ink transition-all duration-200 hover:border-primary hover:bg-paper active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 has-[:checked]:border-primary has-[:checked]:bg-paper-2 has-[:checked]:ring-2 has-[:checked]:ring-primary"
      >
        <input
          :id="`${props.id}-${item}`"
          :checked="props.modelValue.includes(item)"
          type="checkbox"
          :value="item"
          :aria-describedby="props.error ? `${props.id}-error` : undefined"
          :class="CHECKBOX_CLASS"
          @change="toggle(item)"
        />
        {{ $t(`quote.equipment.items.${item}`) }}
      </label>
    </div>

    <p v-if="props.error" :id="`${props.id}-error`" :class="cn(FIELD_ERROR_CLASS, 'mt-2')">
      <Icon name="CircleAlert" :size="14" aria-hidden="true" />
      {{ props.error }}
    </p>
  </fieldset>
</template>

<script setup lang="ts">
import type { QuoteEquipment } from '@/types/quote'

import { CHECKBOX_CLASS, FIELD_ERROR_CLASS } from '@/constants/form'
import { QUOTE_EQUIPMENT } from '@/constants/quote'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    id: string
    modelValue?: QuoteEquipment[]
    error?: string
  }>(),
  {
    modelValue: () => [],
    error: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: QuoteEquipment[]]
}>()

const toggle = (item: QuoteEquipment): void => {
  const next: QuoteEquipment[] = props.modelValue.includes(item)
    ? props.modelValue.filter(selected => selected !== item)
    : QUOTE_EQUIPMENT.filter(known => known === item || props.modelValue.includes(known))
  emit('update:modelValue', next)
}
</script>
