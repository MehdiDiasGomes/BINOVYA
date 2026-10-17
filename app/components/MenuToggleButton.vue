<template>
  <button
    ref="button"
    type="button"
    class="flex flex-col items-center justify-center gap-1.5"
    :aria-label="$t('nav.menu')"
    :aria-expanded="props.isOpen"
    :aria-controls="props.controls"
    @click="emit('toggle')"
  >
    <span
      :class="cn(props.barClass, props.isOpen && 'translate-y-2 rotate-45')"
      aria-hidden="true"
    />
    <span :class="cn(props.barClass, props.isOpen && 'opacity-0')" aria-hidden="true" />
    <span
      :class="cn(props.barClass, props.isOpen && '-translate-y-2 -rotate-45')"
      aria-hidden="true"
    />
  </button>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    isOpen?: boolean
    controls: string
    barClass?: string
  }>(),
  {
    isOpen: false,
    barClass:
      'block h-0.5 w-5 bg-white transition-[translate,rotate,opacity] duration-lift ease-brand motion-reduce:transition-none',
  },
)

const emit = defineEmits<{
  toggle: []
}>()

const button: Ref<HTMLButtonElement | null> = ref(null)

defineExpose({ button })
</script>
