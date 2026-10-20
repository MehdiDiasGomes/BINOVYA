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
      :class="
        cn(
          'flex items-start gap-2 break-words text-sm font-bold',
          props.isError ? ERROR_TEXT_TONE_CLASS : 'text-ink',
        )
      "
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
import { ERROR_TEXT_TONE_CLASS } from '@/constants/feedback'
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
