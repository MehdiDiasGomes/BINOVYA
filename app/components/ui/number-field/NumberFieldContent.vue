<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <div
    data-slot="number-field-content"
    :class="cn('relative', props.class)"
  >
    <slot />
  </div>
</template>
