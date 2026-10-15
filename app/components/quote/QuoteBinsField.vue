<template>
  <fieldset :id="props.id" :aria-describedby="props.error ? `${props.id}-error` : undefined">
    <legend class="mb-4 text-lg font-black text-ink">{{ $t('quote.sections.bins') }}</legend>
    <ul class="grid gap-4 sm:grid-cols-2">
      <li
        v-for="service in BOOKING_SERVICES"
        :key="service.slug"
        class="flex flex-col items-center gap-3 rounded-xl border border-border bg-white p-5 text-center"
      >
        <NuxtImg
          :src="service.image"
          alt=""
          width="96"
          loading="lazy"
          class="h-24 w-24 object-contain"
        />
        <div>
          <p class="text-base font-black text-ink">{{ $t(service.titleKey) }}</p>
          <p class="mt-0.5 text-sm text-ink/70">{{ $t(service.capacityKey) }}</p>
        </div>
        <BookingQuantityStepper
          :model-value="countFor(service.slug)"
          :service-name="$t(service.titleKey)"
          :max="QUOTE_MAX_BIN_COUNT"
          @update:model-value="emitCount(service.slug, $event)"
        />
      </li>
    </ul>
    <p
      v-if="props.error"
      :id="`${props.id}-error`"
      class="mt-2 flex items-center gap-1.5 text-[13px] font-bold text-destructive"
    >
      <Icon name="CircleAlert" :size="14" aria-hidden="true" />
      {{ props.error }}
    </p>
  </fieldset>
</template>

<script setup lang="ts">
import type { ServiceSlug } from '@/types/booking'

import { BOOKING_SERVICES } from '@/constants/booking'
import { QUOTE_MAX_BIN_COUNT } from '@/constants/quote'

const props = withDefaults(
  defineProps<{
    id: string
    smallBinCount?: number
    largeBinCount?: number
    error?: string
  }>(),
  {
    smallBinCount: 0,
    largeBinCount: 0,
    error: '',
  },
)

const emit = defineEmits<{
  'update:smallBinCount': [value: number]
  'update:largeBinCount': [value: number]
}>()

const countFor = (slug: ServiceSlug): number =>
  slug === 'small-bin' ? props.smallBinCount : props.largeBinCount

const emitCount = (slug: ServiceSlug, value: number): void => {
  if (slug === 'small-bin') {
    emit('update:smallBinCount', value)
  } else {
    emit('update:largeBinCount', value)
  }
}
</script>
