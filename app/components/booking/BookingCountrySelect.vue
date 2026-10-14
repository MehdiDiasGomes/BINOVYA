<template>
  <div class="relative z-10 flex">
    <SelectRoot v-model="selected">
      <SelectTrigger
        :id="props.id"
        :aria-label="triggerLabel"
        class="h-12 gap-1.5 rounded-l-lg rounded-r-none border-0 border-r border-ink/15 bg-transparent px-3 shadow-none focus-visible:ring-0 data-[size=default]:h-12"
      >
        <img
          :src="COUNTRY_FLAG_SOURCES[selected]"
          alt=""
          width="24"
          height="16"
          class="h-4 w-6 rounded-[2px] object-cover ring-1 ring-ink/10"
        />
        <span v-if="props.withDialCode" class="text-[15px] font-semibold text-ink">
          {{ COUNTRY_DIAL_CODES[selected] }}
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          v-for="code in COUNTRY_CODES"
          :key="code"
          :value="code"
          class="py-2 text-[15px] text-ink focus:bg-paper-2 focus:text-ink"
        >
          <img
            :src="COUNTRY_FLAG_SOURCES[code]"
            alt=""
            width="24"
            height="16"
            class="h-4 w-6 rounded-[2px] object-cover ring-1 ring-ink/10"
          />
          {{ $t(`booking.countries.${code}`) }}
          <span v-if="props.withDialCode" class="opacity-70">{{ COUNTRY_DIAL_CODES[code] }}</span>
        </SelectItem>
      </SelectContent>
    </SelectRoot>
  </div>
</template>

<script setup lang="ts">
import { SelectRoot } from 'reka-ui'

import type { CountryCode } from '@/types/booking'

import { COUNTRY_CODES, COUNTRY_DIAL_CODES, COUNTRY_FLAG_SOURCES } from '@/constants/booking'

const props = withDefaults(
  defineProps<{
    id: string
    label: string
    modelValue?: CountryCode
    withDialCode?: boolean
  }>(),
  {
    modelValue: 'FR',
    withDialCode: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: CountryCode]
}>()

const { t } = useI18n()

const selected: WritableComputedRef<CountryCode> = computed({
  get: () => props.modelValue,
  set: (value: CountryCode) => emit('update:modelValue', value),
})

const triggerLabel: ComputedRef<string> = computed(() => {
  const country: string = t(`booking.countries.${selected.value}`)
  const dialCode: string = props.withDialCode ? ` ${COUNTRY_DIAL_CODES[selected.value]}` : ''
  return `${props.label} : ${country}${dialCode}`
})
</script>
