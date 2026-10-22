<template>
  <component
    :is="iconComponent"
    :size="props.size"
    :color="props.color"
    :stroke-width="props.strokeWidth"
  />
</template>

<script setup lang="ts">
import * as icons from 'lucide-vue-next'

import type { LucideIconName } from '@/types/icon'
import type { Component } from 'vue'

interface Props {
  name: LucideIconName
  size?: number
  color?: string
  strokeWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  size: 24,
  color: 'currentColor',
  strokeWidth: 2,
})

const iconComponent: ComputedRef<Component> = computed(
  (): Component => icons[props.name] as unknown as Component,
)
</script>
