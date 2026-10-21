<template>
  <p
    class="flex items-start gap-2 rounded-xl border border-border bg-paper-2 px-4 py-3 text-sm font-bold text-ink"
  >
    <Icon
      :name="props.icon"
      :size="16"
      aria-hidden="true"
      :class="cn('mt-0.5 shrink-0', props.iconClass)"
    />
    {{ props.text }}
  </p>
</template>

<script setup lang="ts">
import type { LucideIconName } from '@/constants/clients'

import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    icon?: LucideIconName
    text?: string
    iconClass?: string
  }>(),
  {
    icon: 'Info',
    text: '',
    iconClass: '',
  },
)
</script>
