<template>
  <fieldset>
    <legend class="w-full">
      <span class="flex items-center gap-3">
        <span class="flex shrink-0 -space-x-2">
          <BookingBinIcon
            v-for="lidClass in COLLECTION_LID_CLASSES[props.kind]"
            :key="lidClass"
            :lid-class="lidClass"
          />
        </span>
        <span>
          <span class="block text-base font-black text-ink">
            {{ $t(`booking.collection.${props.kind}.legend`) }}
          </span>
          <span class="block text-[13px] text-ink/70">
            {{ $t(`booking.collection.${props.kind}.lid`) }}
          </span>
        </span>
      </span>
    </legend>
    <p class="mt-3 text-sm font-semibold text-ink">{{ $t('booking.collection.question') }}</p>

    <div class="mt-3 flex flex-wrap gap-2">
      <label
        v-for="weekday in WEEKDAYS_MONDAY_FIRST"
        :key="weekday"
        :for="`booking-collection-${props.kind}-${weekday}`"
        class="group cursor-pointer"
      >
        <input
          :id="`booking-collection-${props.kind}-${weekday}`"
          type="checkbox"
          class="peer sr-only"
          :checked="answer.weekdays.includes(weekday)"
          @change="toggleWeekday(weekday)"
        />
        <span
          class="flex h-11 items-center rounded-full border border-ink/50 bg-white px-4 text-sm font-bold capitalize text-ink transition-[scale,border-color,background-color,color] duration-press ease-brand [@media(hover:hover)]:group-hover:border-primary group-active:scale-[0.97] motion-reduce:transition-none motion-reduce:group-active:scale-100 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2"
        >
          {{ formatWeekday(weekday, locale) }}
        </span>
      </label>
    </div>

    <label
      :for="`booking-collection-${props.kind}-unknown`"
      class="mt-3 flex w-fit cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink"
    >
      <input
        :id="`booking-collection-${props.kind}-unknown`"
        type="checkbox"
        class="h-5 w-5 rounded border-ink/40 accent-primary"
        :checked="answer.isUnknown"
        @change="toggleUnknown"
      />
      {{ $t('booking.collection.unknown') }}
    </label>
  </fieldset>
</template>

<script setup lang="ts">
import type { CollectionAnswer, CollectionKind } from '@/types/booking'

import { COLLECTION_LID_CLASSES, WEEKDAYS_MONDAY_FIRST } from '@/constants/booking'

const props = withDefaults(
  defineProps<{
    kind?: CollectionKind
    modelValue?: CollectionAnswer
  }>(),
  {
    kind: 'household',
    modelValue: () => ({ weekdays: [], isUnknown: false }),
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: CollectionAnswer]
}>()

const { locale } = useI18n()

const answer: ComputedRef<CollectionAnswer> = computed(() => props.modelValue)

const toggleWeekday = (weekday: number): void => {
  const selected: number[] = answer.value.weekdays
  emit('update:modelValue', {
    weekdays: selected.includes(weekday)
      ? selected.filter(day => day !== weekday)
      : [...selected, weekday],
    isUnknown: false,
  })
}

const toggleUnknown = (): void => {
  const isUnknown: boolean = !answer.value.isUnknown
  emit('update:modelValue', {
    weekdays: isUnknown ? [] : answer.value.weekdays,
    isUnknown,
  })
}
</script>
