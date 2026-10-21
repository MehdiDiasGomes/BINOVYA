<template>
  <p
    :class="
      cn(
        'inline-flex items-center gap-1.5 self-start rounded-full bg-amber-300 px-3 py-1.5 text-sm font-black text-navy-950',
        props.class,
      )
    "
  >
    <Icon name="CalendarX" :size="16" aria-hidden="true" class="shrink-0" />
    {{ $t('pro.intervention.toMove') }}
    <span class="sr-only">{{ $t('pro.intervention.toMoveReason') }}</span>
  </p>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes['class']
  }>(),
  {
    class: '',
  },
)
</script>
