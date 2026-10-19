<template>
  <div ref="rootRef">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <AppButton :variant="props.variant" data-pro-reschedule :class="props.triggerClass">
          <Icon name="Ellipsis" :size="20" aria-hidden="true" />
          <span class="sr-only">{{ $t('pro.card.moreName', { subject: props.subject }) }}</span>
        </AppButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        class="min-w-60 rounded-xl p-1.5 shadow-lg"
        @close-auto-focus="openPendingReschedule"
      >
        <DropdownMenuItem
          class="min-h-12 gap-3 rounded-lg px-3 text-[15px] font-semibold text-ink"
          @select="isReschedulePending = true"
        >
          <Icon name="CalendarClock" :size="20" aria-hidden="true" class="size-5 shrink-0" />
          {{ $t('pro.intervention.reschedule') }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>

<script setup lang="ts">
import type { ButtonVariant } from '@/types/button'
import type { HTMLAttributes } from 'vue'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const props = withDefaults(
  defineProps<{
    subject: string
    variant?: ButtonVariant
    triggerClass?: HTMLAttributes['class']
  }>(),
  {
    variant: 'onDarkGhost',
    triggerClass: undefined,
  },
)

const emit = defineEmits<{
  reschedule: [trigger: HTMLElement | null]
}>()

const rootRef: Ref<HTMLElement | null> = ref(null)

const isReschedulePending: Ref<boolean> = ref(false)

/**
 * Opens « Change the date » once the menu has closed, so the dialog takes focus after the menu
 * gave it back, and restores it to the « More actions » button when the dialog closes.
 * @param event - `closeAutoFocus` event of the menu content
 */
const openPendingReschedule = (event: Event): void => {
  if (!isReschedulePending.value) {
    return
  }
  event.preventDefault()
  isReschedulePending.value = false
  emit('reschedule', rootRef.value?.querySelector<HTMLElement>('[data-pro-reschedule]') ?? null)
}
</script>
