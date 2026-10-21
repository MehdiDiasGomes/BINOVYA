<template>
  <AnimatePresence :initial="false">
    <Motion
      v-if="props.message"
      key="feedback"
      as="p"
      :initial="{ opacity: 0, y: -FEEDBACK_OFFSET }"
      :animate="{ opacity: 1, y: 0 }"
      :exit="{ opacity: 0 }"
      :transition="STEP_TRANSITION"
      :class="props.isError ? INLINE_ERROR_CLASS : cn(INLINE_FEEDBACK_CLASS, 'text-ink')"
    >
      <Icon
        :name="props.isError ? 'CircleAlert' : 'CircleCheck'"
        :size="16"
        aria-hidden="true"
        class="mt-0.5 shrink-0"
      />
      {{ props.message }}
    </Motion>
  </AnimatePresence>
</template>

<script setup lang="ts">
import { INLINE_ERROR_CLASS, INLINE_FEEDBACK_CLASS } from '@/constants/feedback'
import { FEEDBACK_OFFSET, STEP_TRANSITION } from '@/constants/motion'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    message?: string
    isError?: boolean
  }>(),
  {
    message: '',
    isError: false,
  },
)
</script>
