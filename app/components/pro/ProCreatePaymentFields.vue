<template>
  <div class="space-y-5">
    <fieldset>
      <legend class="text-base font-black text-ink">{{ $t('pro.create.mode.legend') }}</legend>
      <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label
          v-for="mode in PRO_BOOKING_MODES"
          :key="mode"
          :for="modeId(mode)"
          class="group block cursor-pointer"
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
            class="flex h-full min-h-14 flex-col rounded-xl border-2 border-ink/50 bg-white p-4 transition-[border-color,background-color,box-shadow,scale] duration-press ease-brand group-active:scale-[0.98] motion-reduce:transition-none motion-reduce:group-active:scale-100 peer-checked:border-primary peer-checked:bg-paper-2 peer-checked:shadow-sm peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 [@media(hover:hover)]:group-hover:border-primary"
          >
            <span class="flex items-center justify-between gap-3">
              <span class="min-w-0 break-words text-sm font-black text-ink">
                {{ $t(`pro.create.mode.${mode}.label`) }}
              </span>
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
            <span :id="`${modeId(mode)}-hint`" class="mt-1 text-[13px] text-ink/70">
              {{ $t(`pro.create.mode.${mode}.hint`) }}
            </span>
          </span>
        </label>
      </div>
    </fieldset>

    <dl
      class="flex items-baseline justify-between gap-3 rounded-xl border border-border bg-paper-2 px-4 py-3"
    >
      <dt class="text-sm font-bold text-ink">{{ $t('pro.create.price.label') }}</dt>
      <dd class="text-right text-lg font-black tabular-nums text-ink">{{ priceText }}</dd>
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
