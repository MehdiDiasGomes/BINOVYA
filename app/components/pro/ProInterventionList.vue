<template>
  <div ref="rootRef">
    <ul v-if="props.isLoading" aria-hidden="true" class="grid gap-6 md:grid-cols-2">
      <li
        v-for="placeholder in ACCOUNT_SKELETON_CARD_COUNT"
        :key="placeholder"
        :class="cn(placeholder > ACCOUNT_SKELETON_MOBILE_CARD_COUNT && 'hidden md:block')"
      >
        <MediaCardSkeleton :detail-rows="skeletonRows" :has-footer="false" stack-rows>
          <template #action>
            <div class="flex items-center gap-3">
              <SkeletonBlock surface="dark" class="h-12 flex-1 rounded-full" />
              <SkeletonBlock surface="dark" class="size-12 shrink-0 rounded-full" />
            </div>
          </template>
        </MediaCardSkeleton>
      </li>
    </ul>

    <div v-else-if="props.hasError" role="alert">
      <p class="flex items-center gap-2 text-sm font-bold text-red-700">
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
          :today="today"
          :origin="props.origin"
          @reschedule="openReschedule(intervention, $event)"
        />
      </Reveal>
    </ul>

    <ProRescheduleDialog
      v-model:open="isRescheduleOpen"
      :intervention="rescheduledIntervention"
      :trigger="rescheduleTrigger"
      @rescheduled="emit('rescheduled', $event)"
      @stale="emit('stale')"
    />
  </div>
</template>

<script setup lang="ts">
import type { FocusTarget } from '@/types/button'
import type { MediaCardTitleTag } from '@/types/mediaCard'
import type { ProIntervention } from '@/types/pro'
import type { ProRescheduledEvent } from '@/types/proAvailability'
import type { ProInterventionOrigin } from '@/types/proSteps'
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
import { PRO_SKELETON_DETAIL_ROWS, PRO_SKELETON_DETAIL_ROWS_WITH_DATE } from '@/constants/pro'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    interventions?: ProIntervention[]
    isLoading?: boolean
    hasError?: boolean
    emptyText?: string
    showDate?: boolean
    cardTitleTag?: MediaCardTitleTag
    origin?: ProInterventionOrigin
  }>(),
  {
    interventions: () => [],
    isLoading: false,
    hasError: false,
    emptyText: '',
    showDate: false,
    cardTitleTag: 'h3',
    origin: 'planning',
  },
)

const emit = defineEmits<{
  retry: []
  rescheduled: [moved: ProRescheduledEvent]
  stale: []
}>()

const today: Readonly<Ref<string>> = useBusinessToday()

const isRescheduleOpen: Ref<boolean> = ref(false)

const rescheduledIntervention: Ref<ProIntervention | null> = ref(null)

const rescheduleTrigger: ShallowRef<HTMLElement | null> = shallowRef(null)

const openReschedule = (intervention: ProIntervention, trigger: HTMLElement | null): void => {
  rescheduledIntervention.value = intervention
  rescheduleTrigger.value = trigger
  isRescheduleOpen.value = true
}

const skeletonRows: ComputedRef<number> = computed(() =>
  props.showDate ? PRO_SKELETON_DETAIL_ROWS_WITH_DATE : PRO_SKELETON_DETAIL_ROWS,
)

const retryButton: Ref<FocusTarget | null> = ref(null)

const rootRef: Ref<HTMLElement | null> = ref(null)

/**
 * Moves keyboard focus to the « More actions » button, holding « Change the date », of the first
 * intervention still to do.
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
