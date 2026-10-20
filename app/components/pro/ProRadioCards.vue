<template>
  <fieldset>
    <legend class="text-base font-black text-ink">{{ props.legend }}</legend>
    <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label
        v-for="option in props.options"
        :key="option.value"
        :for="optionId(option.value)"
        class="group block cursor-pointer"
      >
        <input
          :id="optionId(option.value)"
          type="radio"
          :name="props.name"
          :value="option.value"
          :checked="option.value === model"
          :aria-describedby="`${optionId(option.value)}-hint`"
          class="peer sr-only"
          @change="model = option.value"
        />
        <span :class="PRO_RADIO_CARD_CLASS">
          <span class="flex items-center justify-between gap-3">
            <span class="min-w-0 break-words text-sm font-black text-ink">{{ option.label }}</span>
            <Icon
              name="Circle"
              :size="20"
              aria-hidden="true"
              class="shrink-0 text-ink/50 group-has-[:checked]:hidden"
            />
            <Icon
              name="CircleCheck"
              :size="20"
              aria-hidden="true"
              class="hidden shrink-0 text-primary group-has-[:checked]:block"
            />
          </span>
          <span :id="`${optionId(option.value)}-hint`" class="mt-1 text-[13px] text-ink/70">
            {{ option.hint }}
          </span>
        </span>
      </label>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import type { ProRadioOption } from '@/types/proCreate'

import { PRO_RADIO_CARD_CLASS } from '@/constants/proCreate'

const props = withDefaults(
  defineProps<{
    name: string
    legend: string
    options?: ProRadioOption[]
  }>(),
  {
    options: () => [],
  },
)

const model = defineModel<string>({ required: true })

const optionId = (value: string): string => `${props.name}-${value}`
</script>
