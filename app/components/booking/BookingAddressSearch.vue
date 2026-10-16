<template>
  <div>
    <div class="group grid grid-cols-[auto_minmax(0,1fr)]">
      <span aria-hidden="true" :class="INPUT_GROUP_FRAME_CLASS" />
      <BookingCountrySelect
        :id="`${props.id}-country`"
        :model-value="countryCode"
        :label="$t('booking.address.country')"
        class="col-start-1 row-start-2"
        @update:model-value="changeCountry"
      />
      <label :for="props.id" class="contents">
        <span class="col-span-2 row-start-1 mb-1.5 block text-sm font-bold text-ink">
          {{ $t('booking.address.label') }}
        </span>
        <input
          :id="props.id"
          v-model="query"
          type="text"
          role="combobox"
          autocomplete="off"
          aria-autocomplete="list"
          :aria-controls="`${props.id}-listbox`"
          :aria-describedby="describedBy"
          :aria-invalid="props.error ? 'true' : undefined"
          :aria-expanded="isListOpen"
          :aria-activedescendant="activeOptionId"
          :placeholder="$t(`booking.address.placeholder.${countryCode}`)"
          class="relative z-10 col-start-2 row-start-2 h-12 min-w-0 bg-transparent px-3 text-[15px] text-ink outline-none placeholder:text-ink/60"
          @input="handleInput"
          @keydown="handleKeydown"
          @blur="isListVisible = false"
        />
      </label>
    </div>
    <p :id="`${props.id}-hint`" class="mt-1.5 text-[13px] text-ink/70">
      {{ $t('booking.address.hint') }}
    </p>
    <p v-if="props.error" :id="`${props.id}-error`" :class="FIELD_ERROR_CLASS">
      <Icon name="CircleAlert" :size="14" aria-hidden="true" />
      {{ props.error }}
    </p>

    <div class="relative">
      <ul
        v-if="isListOpen"
        :id="`${props.id}-listbox`"
        role="listbox"
        :aria-label="$t('booking.address.listLabel')"
        class="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-white py-1 shadow-lg"
        @mousedown.prevent
      >
        <li
          v-for="(suggestion, index) in suggestions"
          :id="`${props.id}-option-${index}`"
          :key="suggestion.label"
          role="option"
          tabindex="-1"
          :aria-selected="index === activeIndex"
          :class="
            cn(
              'flex cursor-pointer items-center gap-2.5 px-4 py-3 text-sm text-ink',
              index === activeIndex && 'bg-paper-2',
            )
          "
          @click="selectSuggestion(suggestion)"
          @keydown.enter="selectSuggestion(suggestion)"
          @mouseenter="activeIndex = index"
          @focus="activeIndex = index"
        >
          <Icon name="MapPin" :size="15" aria-hidden="true" class="shrink-0 text-ink/50" />
          {{ suggestion.label }}
        </li>
      </ul>
    </div>

    <p class="mt-3 text-sm text-ink/70 empty:mt-0" role="status">
      <span v-if="isLoading">{{ $t('booking.address.loading') }}</span>
      <span v-else-if="hasError" class="font-semibold text-destructive">
        {{ $t('booking.address.error') }}
      </span>
      <span v-else-if="hasNoResult">{{ $t('booking.address.noResult') }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'

import type { BookingAddress, CountryCode } from '@/types/booking'

import {
  BOOKING_ADDRESS_INPUT_ID,
  FIELD_ERROR_CLASS,
  INPUT_GROUP_FRAME_CLASS,
} from '@/constants/booking'
import { cn } from '@/lib/utils'
import { describedByIds } from '@/utils/field'

const props = withDefaults(
  defineProps<{
    id?: string
    modelValue?: BookingAddress | null
    error?: string
  }>(),
  {
    id: BOOKING_ADDRESS_INPUT_ID,
    modelValue: null,
    error: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: BookingAddress | null]
}>()

const SEARCH_DELAY_MS = 500

const { t } = useI18n()

const countryCode: Ref<CountryCode> = ref(props.modelValue?.countryCode ?? 'FR')
const { suggestions, isLoading, hasError, hasSearched, search, clear } =
  useAddressSearch(countryCode)

const query: Ref<string> = ref(props.modelValue?.label ?? '')
const isListVisible: Ref<boolean> = ref(false)
const activeIndex: Ref<number> = ref(-1)

const isListOpen: ComputedRef<boolean> = computed(
  () => isListVisible.value && suggestions.value.length > 0,
)

const activeOptionId: ComputedRef<string | undefined> = computed(() =>
  isListOpen.value && activeIndex.value >= 0
    ? `${props.id}-option-${activeIndex.value}`
    : undefined,
)

const describedBy: ComputedRef<string | undefined> = computed((): string | undefined =>
  describedByIds(props.id, t('booking.address.hint'), props.error),
)

const hasNoResult: ComputedRef<boolean> = computed(
  () => hasSearched.value && suggestions.value.length === 0 && props.modelValue === null,
)

const debouncedSearch = useDebounceFn(
  (text: string): Promise<void> => search(text),
  SEARCH_DELAY_MS,
)

watch(
  () => props.modelValue,
  (address: BookingAddress | null, previous: BookingAddress | null): void => {
    if (!address && previous && query.value === previous.label) {
      query.value = ''
    }
  },
)

const handleInput = (): void => {
  emit('update:modelValue', null)
  isListVisible.value = true
  activeIndex.value = -1
  debouncedSearch(query.value).catch(() => clear())
}

const changeCountry = (code: CountryCode): void => {
  countryCode.value = code
  query.value = ''
  emit('update:modelValue', null)
  isListVisible.value = false
  clear()
}

const selectSuggestion = (suggestion: BookingAddress): void => {
  query.value = suggestion.label
  isListVisible.value = false
  clear()
  emit('update:modelValue', suggestion)
}

const moveActive = (delta: number): void => {
  const count: number = suggestions.value.length
  if (count === 0) {
    return
  }
  isListVisible.value = true
  activeIndex.value = (activeIndex.value + delta + count) % count
}

const confirmActive = (): void => {
  const suggestion: BookingAddress | undefined = suggestions.value[activeIndex.value]
  if (isListOpen.value && suggestion) {
    selectSuggestion(suggestion)
  }
}

const keyHandlers: Record<string, () => void> = {
  ArrowDown: () => moveActive(1),
  ArrowUp: () => moveActive(-1),
  Enter: confirmActive,
  Escape: () => {
    isListVisible.value = false
  },
}

const handleKeydown = (event: KeyboardEvent): void => {
  const handler: (() => void) | undefined = keyHandlers[event.key]
  if (!handler) {
    return
  }
  if (event.key !== 'Escape' || isListOpen.value) {
    event.preventDefault()
  }
  handler()
}
</script>
