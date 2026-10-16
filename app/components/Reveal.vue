<template>
  <Motion
    :as="as"
    :initial="{ opacity: 0, ...REVEAL_OFFSETS[direction] }"
    :while-in-view="{ opacity: 1, x: 0, y: 0 }"
    :in-view-options="{ once: true, margin: '0px 0px -80px 0px' }"
    :transition="{ ...CONTENT_ENTER_TRANSITION, delay }"
  >
    <slot />
  </Motion>
</template>

<script setup lang="ts">
import type { RevealDirection } from '@/types/motion'

import { CONTENT_ENTER_TRANSITION, REVEAL_OFFSETS } from '@/constants/motion'

type RevealTag = 'div' | 'li' | 'section' | 'article'

withDefaults(
  defineProps<{
    as?: RevealTag
    direction?: RevealDirection
    delay?: number
  }>(),
  {
    as: 'div',
    direction: 'up',
    delay: 0,
  },
)
</script>
