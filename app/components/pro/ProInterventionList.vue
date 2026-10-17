<template>
  <div ref="rootRef">
    <ul v-if="props.isLoading" aria-hidden="true" class="grid gap-6 md:grid-cols-2">
      <li
        v-for="placeholder in ACCOUNT_SKELETON_CARD_COUNT"
        :key="placeholder"
        :class="cn(placeholder > ACCOUNT_SKELETON_MOBILE_CARD_COUNT && 'hidden md:block')"
      >
        <MediaCardSkeleton
          :detail-rows="props.skeletonRows"
          :tall-rows="skeletonTallRows"
          :collapsed-rows="skeletonCollapsedRows"
          stack-rows
        />
      </li>
    </ul>

    <div v-else-if="props.hasError" role="alert">
      <p class="flex items-center gap-2 text-sm font-bold text-destructive">
        <Icon name="CircleAlert" :size="16" aria-hidden="true" />
        {{ $t('pro.loadError') }}
      </p>
      <AppButton
        ref="retryButton"
        variant="secondary"
        icon="RotateCw"
        class="mt-3"
        @click="emit('retry')"
      >
        {{ $t('pro.retry') }}
      </AppButton>
    </div>

    <Motion
      v-else-if="props.interventions.length === 0"
      as="p"
      :initial="{ opacity: 0, y: CONTENT_ENTER_OFFSET }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="CONTENT_ENTER_TRANSITION"
      class="rounded-2xl border border-border bg-white p-6 text-[15px] text-ink/80 shadow-sm"
    >
      {{ props.emptyText }}
    </Motion>

    <ul v-else class="grid gap-6 md:grid-cols-2">
      <Reveal
        v-for="(intervention, index) in props.interventions"
        :key="intervention.id"
        as="li"
        :delay="Math.min(index, REVEAL_MAX_STAGGER_STEPS) * REVEAL_STAGGER"
      >
        <ProInterventionCard
          :intervention="intervention"
          :show-date="props.showDate"
          :title-tag="props.cardTitleTag"
          @reschedule="openReschedule(intervention, $event)"
        />
      </Reveal>
    </ul>

    <ProRescheduleDialog
      v-model:open="isRescheduleOpen"
      :intervention="rescheduledIntervention"
      :trigger="rescheduleTrigger"
      @rescheduled="emit('rescheduled', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { FocusTarget } from '@/types/button'
import type { MediaCardTitleTag } from '@/types/mediaCard'
import type { ProIntervention } from '@/types/pro'
import type { ProRescheduledEvent } from '@/types/proAvailability'
import type { ShallowRef } from 'vue'

import {
  ACCOUNT_SKELETON_CARD_COUNT,
  ACCOUNT_SKELETON_MOBILE_CARD_COUNT,
} from '@/constants/account'
import {
  CONTENT_ENTER_OFFSET,
  CONTENT_ENTER_TRANSITION,
  REVEAL_MAX_STAGGER_STEPS,
  REVEAL_STAGGER,
} from '@/constants/motion'
import {
  PRO_SKELETON_COLLAPSED_ROWS,
  PRO_SKELETON_DATE_ROWS,
  PRO_SKELETON_DETAIL_ROWS,
  PRO_SKELETON_DETAIL_ROWS_WITH_DATE,
  PRO_SKELETON_PHONE_ROW,
} from '@/constants/pro'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    interventions?: ProIntervention[]
    isLoading?: boolean
    hasError?: boolean
    emptyText?: string
    showDate?: boolean
    cardTitleTag?: MediaCardTitleTag
    skeletonRows?: number
  }>(),
  {
    interventions: () => [],
    isLoading: false,
    hasError: false,
    emptyText: '',
    showDate: false,
    cardTitleTag: 'h3',
    skeletonRows: (rawProps: { showDate?: boolean }): number =>
      rawProps.showDate ? PRO_SKELETON_DETAIL_ROWS_WITH_DATE : PRO_SKELETON_DETAIL_ROWS,
  },
)

const emit = defineEmits<{
  retry: []
  rescheduled: [moved: ProRescheduledEvent]
}>()

const isRescheduleOpen: Ref<boolean> = ref(false)

const rescheduledIntervention: Ref<ProIntervention | null> = ref(null)

const rescheduleTrigger: ShallowRef<HTMLElement | null> = shallowRef(null)

const openReschedule = (intervention: ProIntervention, trigger: HTMLElement | null): void => {
  rescheduledIntervention.value = intervention
  rescheduleTrigger.value = trigger
  isRescheduleOpen.value = true
}

const skeletonTallRows: ComputedRef<number[]> = computed(() => [
  PRO_SKELETON_PHONE_ROW + (props.showDate ? PRO_SKELETON_DATE_ROWS : 0),
])

const skeletonCollapsedRows: ComputedRef<number> = computed(
  () => PRO_SKELETON_COLLAPSED_ROWS + (props.showDate ? PRO_SKELETON_DATE_ROWS : 0),
)

const retryButton: Ref<FocusTarget | null> = ref(null)

const rootRef: Ref<HTMLElement | null> = ref(null)

/**
 * Moves keyboard focus to the « Change the date » button of the first intervention still to do.
 * @returns True when a button received focus
 */
const focusFirstReschedule = (): boolean => {
  const button: HTMLButtonElement | null | undefined =
    rootRef.value?.querySelector<HTMLButtonElement>('[data-pro-reschedule]')
  button?.focus()
  return Boolean(button)
}

defineExpose({ retryButton, focusFirstReschedule })
</script>
