<template>
  <svg
    role="img"
    :aria-label="$t('common.brandLogoLabel')"
    :viewBox="box.viewBox"
    :width="box.width"
    :height="box.height"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="14"
      y="20"
      width="24"
      height="7.5"
      rx="3"
      transform="rotate(-48 16 23.75)"
      class="fill-turquoise-deep"
    />
    <path d="M33 28C31.5 16.5 37.5 7 52 2.5c1.6 14-4.4 23.6-19 25.5z" class="fill-turquoise" />
    <path
      d="M33 28c4.6-7.6 9.6-14 16.6-20"
      fill="none"
      stroke-width="2.2"
      stroke-linecap="round"
      :class="toneClasses.holeStroke"
    />
    <rect x="14" y="24" width="36" height="5.5" rx="2.75" :class="toneClasses.ink" />
    <path
      d="M17.5 29.5h29l-2.6 25.6a3.4 3.4 0 0 1-3.4 3H23.5a3.4 3.4 0 0 1-3.4-3z"
      :class="toneClasses.ink"
    />
    <path
      d="M28.5 35.5v16M36 35.5v16"
      stroke-opacity=".3"
      stroke-width="3"
      stroke-linecap="round"
      :class="toneClasses.holeStroke"
    />
    <circle
      cx="20"
      cy="56.5"
      r="5.5"
      stroke-width="2.5"
      :class="cn(toneClasses.ink, toneClasses.holeStroke)"
    />
    <circle cx="20" cy="56.5" r="1.8" class="fill-turquoise" />
    <path v-if="props.hasWordmark" :d="BRAND_WORDMARK_PATH" :class="toneClasses.ink" />
  </svg>
</template>

<script setup lang="ts">
import type { BrandLogoBox, BrandLogoTone, BrandLogoToneClasses } from '@/types/brand'

import {
  BRAND_LOCKUP_BOX,
  BRAND_LOGO_TONE_CLASSES,
  BRAND_MARK_BOX,
  BRAND_WORDMARK_PATH,
} from '@/constants/brand'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    tone?: BrandLogoTone
    hasWordmark?: boolean
  }>(),
  {
    tone: 'onLight',
    hasWordmark: true,
  },
)

const toneClasses: ComputedRef<BrandLogoToneClasses> = computed(
  (): BrandLogoToneClasses => BRAND_LOGO_TONE_CLASSES[props.tone],
)

const box: ComputedRef<BrandLogoBox> = computed(
  (): BrandLogoBox => (props.hasWordmark ? BRAND_LOCKUP_BOX : BRAND_MARK_BOX),
)
</script>
