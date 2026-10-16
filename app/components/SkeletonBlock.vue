<template>
  <div
    aria-hidden="true"
    :class="
      cn(
        'animate-pulse rounded-md motion-reduce:animate-none',
        props.surface === 'dark' ? 'bg-white/15' : 'bg-ink/10',
        props.class,
      )
    "
  />
</template>

<script setup lang="ts">
import type { SkeletonSurface } from '@/types/skeleton'
import type { HTMLAttributes } from 'vue'

import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    surface?: SkeletonSurface
    class?: HTMLAttributes['class']
  }>(),
  {
    surface: 'light',
    class: '',
  },
)
</script>
