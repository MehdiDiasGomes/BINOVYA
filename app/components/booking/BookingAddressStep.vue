<template>
  <div>
    <div class="group grid grid-cols-[auto_minmax(0,1fr)]">
      <span aria-hidden="true" :class="INPUT_GROUP_FRAME_CLASS" />
      <BookingCountrySelect
        id="booking-address-country"
        :model-value="countryCode"
        :label="$t('booking.address.country')"
        class="col-start-1 row-start-2"
        @update:model-value="changeCountry"
      />
      <label for="booking-address" class="contents">
        <span class="col-span-2 row-start-1 mb-1.5 block text-sm font-bold text-ink">
          {{ $t('booking.address.label') }}
        </span>
        <input
          id="booking-address"
          v-model="query"
          type="text"
          role="combobox"
          autocomplete="off"
          aria-autocomplete="list"
          aria-controls="booking-address-listbox"
          aria-describedby="booking-address-hint"
          :aria-expanded="isListOpen"
          :aria-activedescendant="activeOptionId"
          :placeholder="$t(`booking.address.placeholder.${countryCode}`)"
          class="relative z-10 col-start-2 row-start-2 h-12 min-w-0 bg-transparent px-3 text-[15px] text-ink outline-none placeholder:text-ink/50"
          @input="handleInput"
          @keydown="handleKeydown"
          @blur="isListVisible = false"
        />
      </label>
    </div>
    <p id="booking-address-hint" class="mt-1.5 text-[13px] text-ink/70">
      {{ $t('booking.address.hint') }}
    </p>

    <div class="relative">
      <ul
        v-if="isListOpen"
        id="booking-address-listbox"
        role="listbox"
        :aria-label="$t('booking.address.listLabel')"
        class="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-white py-1 shadow-lg"
        @mousedown.prevent
      >
        <li
          v-for="(suggestion, index) in suggestions"
          :id="`booking-address-option-${index}`"
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

    <p class="mt-3 min-h-5 text-sm text-ink/70" role="status">
      <span v-if="isLoading">{{ $t('booking.address.loading') }}</span>
      <span v-else-if="hasError" class="font-semibold text-destructive">
        {{ $t('booking.address.error') }}
      </span>
      <span v-else-if="hasNoResult">{{ $t('booking.address.noResult') }}</span>
    </p>

    <p
      v-if="draft.address && state === 'loading'"
      role="status"
      class="mt-2 flex items-center gap-2.5 rounded-xl border border-border p-4 text-sm font-semibold text-ink"
    >
      <Icon name="Loader2" :size="18" aria-hidden="true" class="animate-spin text-primary" />
      {{ $t('booking.address.checking') }}
    </p>

    <div
      v-else-if="draft.address && state === 'error'"
      role="alert"
      class="mt-2 flex items-start gap-3 rounded-xl border border-destructive/40 bg-red-50 p-4 text-sm text-ink"
    >
      <Icon
        name="CircleAlert"
        :size="20"
        aria-hidden="true"
        class="mt-0.5 shrink-0 text-destructive"
      />
      <div>
        <p class="font-bold">{{ $t('booking.address.checkError') }}</p>
        <button
          type="button"
          class="mt-1.5 font-bold underline underline-offset-4 hover:text-primary"
          @click="checkAddress"
        >
          {{ $t('booking.address.retry') }}
        </button>
      </div>
    </div>

    <div
      v-else-if="draft.address && state === 'ready'"
      role="status"
      :class="
        cn(
          'mt-2 flex items-start gap-3 rounded-xl border p-4',
          isInServiceArea ? 'border-green-700/25 bg-green-50' : 'border-amber-700/30 bg-amber-50',
        )
      "
    >
      <Icon
        :name="isInServiceArea ? 'CircleCheck' : 'TriangleAlert'"
        :size="20"
        aria-hidden="true"
        :class="cn('mt-0.5 shrink-0', isInServiceArea ? 'text-green-700' : 'text-amber-700')"
      />
      <div class="text-sm text-ink">
        <p class="font-bold">
          {{
            isInServiceArea
              ? $t('booking.address.inArea', { city: draft.address.city })
              : $t('booking.address.outOfArea', {
                  city: draft.address.city,
                  radius: serviceAreaRadiusKm,
                })
          }}
        </p>
        <NuxtLink
          v-if="!isInServiceArea"
          :to="{ path: localePath('/'), hash: '#contact' }"
          class="mt-1.5 inline-block font-bold text-ink underline underline-offset-4 hover:text-primary"
        >
          {{ $t('booking.address.outOfAreaCta') }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'

import type { BookingAddress, CountryCode } from '@/types/booking'

import { INPUT_GROUP_FRAME_CLASS } from '@/constants/booking'
import { cn } from '@/lib/utils'

const SEARCH_DELAY_MS = 500

const localePath = useLocalePath()
const { draft } = useBookingDraft()
const {
  state,
  isInServiceArea,
  serviceAreaRadiusKm,
  load: loadAvailability,
  reset: resetAvailability,
} = useBookingAvailability()
const countryCode: Ref<CountryCode> = ref(draft.value.address?.countryCode ?? 'FR')
const { suggestions, isLoading, hasError, hasSearched, search, clear } =
  useAddressSearch(countryCode)

const query: Ref<string> = ref(draft.value.address?.label ?? '')
const isListVisible: Ref<boolean> = ref(false)
const activeIndex: Ref<number> = ref(-1)

const isListOpen: ComputedRef<boolean> = computed(
  () => isListVisible.value && suggestions.value.length > 0,
)

const activeOptionId: ComputedRef<string | undefined> = computed(() =>
  isListOpen.value && activeIndex.value >= 0
    ? `booking-address-option-${activeIndex.value}`
    : undefined,
)

const hasNoResult: ComputedRef<boolean> = computed(
  () => hasSearched.value && suggestions.value.length === 0 && draft.value.address === null,
)

const debouncedSearch = useDebounceFn(
  (text: string): Promise<void> => search(text),
  SEARCH_DELAY_MS,
)

const checkAddress = (): void => {
  loadAvailability().catch(() => resetAvailability())
}

const handleInput = (): void => {
  draft.value.address = null
  draft.value.date = null
  resetAvailability()
  isListVisible.value = true
  activeIndex.value = -1
  debouncedSearch(query.value).catch(() => clear())
}

const changeCountry = (code: CountryCode): void => {
  countryCode.value = code
  query.value = ''
  draft.value.address = null
  draft.value.date = null
  resetAvailability()
  isListVisible.value = false
  clear()
}

const selectSuggestion = (suggestion: BookingAddress): void => {
  draft.value.address = suggestion
  draft.value.date = null
  query.value = suggestion.label
  isListVisible.value = false
  clear()
  checkAddress()
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
