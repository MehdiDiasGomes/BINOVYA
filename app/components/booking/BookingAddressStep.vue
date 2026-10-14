<template>
  <div class="space-y-4">
    <BookingAddressSearch :model-value="draft.address" @update:model-value="handleAddress" />

    <p
      v-if="draft.address && state === 'loading'"
      role="status"
      class="flex items-center gap-2.5 rounded-xl border border-border p-4 text-sm font-semibold text-ink"
    >
      <Icon name="Loader2" :size="18" aria-hidden="true" class="animate-spin text-primary" />
      {{ $t('booking.address.checking') }}
    </p>

    <div
      v-else-if="draft.address && state === 'error'"
      role="alert"
      class="flex items-start gap-3 rounded-xl border border-destructive/40 bg-red-50 p-4 text-sm text-ink"
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
          'flex items-start gap-3 rounded-xl border p-4',
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
import type { BookingAddress } from '@/types/booking'

import { cn } from '@/lib/utils'

const localePath = useLocalePath()
const { draft } = useBookingDraft()
const {
  state,
  isInServiceArea,
  serviceAreaRadiusKm,
  load: loadAvailability,
  reset: resetAvailability,
} = useBookingAvailability()

const checkAddress = (): void => {
  loadAvailability().catch(() => resetAvailability())
}

const handleAddress = (address: BookingAddress | null): void => {
  draft.value.address = address
  draft.value.date = null
  resetAvailability()
  if (address) {
    checkAddress()
  }
}
</script>
