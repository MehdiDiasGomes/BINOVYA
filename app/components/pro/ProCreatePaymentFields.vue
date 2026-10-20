<template>
  <div class="space-y-5">
    <fieldset>
      <legend class="text-base font-black text-ink">{{ $t('pro.create.mode.legend') }}</legend>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label
          v-for="mode in PRO_BOOKING_MODES"
          :key="mode"
          :for="modeId(mode)"
          class="group cursor-pointer"
        >
          <input
            :id="modeId(mode)"
            type="radio"
            :name="`${PRO_CREATE_ID_PREFIX}-mode`"
            :value="mode"
            :checked="mode === draft.mode"
            :aria-describedby="`${modeId(mode)}-hint`"
            class="peer sr-only"
            @change="draft.mode = mode"
          />
          <span
            class="flex h-full min-h-11 flex-col rounded-xl border-2 border-border bg-white p-4 peer-checked:border-primary peer-checked:bg-paper-2 peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2"
          >
            <span class="flex items-center justify-between gap-2">
              <span class="text-sm font-black text-ink">
                {{ $t(`pro.create.mode.${mode}.label`) }}
              </span>
              <Icon
                name="CircleCheck"
                :size="18"
                aria-hidden="true"
                class="hidden shrink-0 text-primary group-has-[:checked]:block"
              />
            </span>
            <span :id="`${modeId(mode)}-hint`" class="mt-1 text-[13px] text-ink/70">
              {{ $t(`pro.create.mode.${mode}.hint`) }}
            </span>
          </span>
        </label>
      </div>
    </fieldset>

    <dl class="flex items-baseline justify-between gap-3 rounded-xl bg-paper-2 px-4 py-3">
      <dt class="text-sm font-bold text-ink">{{ $t('pro.create.price.label') }}</dt>
      <dd class="text-right text-lg font-black text-ink">{{ priceText }}</dd>
    </dl>
  </div>
</template>

<script setup lang="ts">
import type { ProBookingMode, ProCreateDraft } from '@/types/proCreate'

import { PRO_BOOKING_MODES, PRO_CREATE_ID_PREFIX } from '@/constants/proCreate'
import { formatPrice } from '@/utils/pricing'

const props = withDefaults(
  defineProps<{
    priceCents?: number | null
  }>(),
  {
    priceCents: null,
  },
)

const draft = defineModel<ProCreateDraft>({ required: true })

const { t, locale } = useI18n()

const modeId = (mode: ProBookingMode): string => `${PRO_CREATE_ID_PREFIX}-mode-${mode}`

const priceText: ComputedRef<string> = computed(() =>
  props.priceCents === null
    ? t('pro.create.price.unknown')
    : formatPrice(props.priceCents, locale.value),
)
</script>
