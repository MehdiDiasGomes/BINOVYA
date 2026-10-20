<template>
  <div>
    <ul
      v-if="props.isLoading"
      aria-hidden="true"
      class="grid grid-cols-1 gap-3 sm:gap-6 md:grid-cols-2"
    >
      <li
        v-for="placeholder in skeletonCount"
        :key="placeholder"
        :class="
          cn(
            'min-w-0',
            placeholder > PRO_SKELETON_MOBILE_ROW_COUNT && 'max-sm:hidden',
            placeholder > ACCOUNT_SKELETON_MOBILE_CARD_COUNT && 'sm:max-md:hidden',
            placeholder > ACCOUNT_SKELETON_CARD_COUNT && 'md:hidden',
          )
        "
      >
        <div :class="cn(PRO_ROW_SHELL_CLASS, MEDIA_CARD_TONES.info.surface, 'sm:hidden')">
          <SkeletonBlock surface="dark" class="size-10 shrink-0 rounded-full" />
          <div class="min-w-0 flex-1">
            <div class="flex h-lh items-center font-heading text-base leading-tight">
              <SkeletonBlock surface="dark" class="h-4 w-2/3" />
            </div>
            <div class="text-sm">
              <div class="flex h-lh items-center">
                <SkeletonBlock surface="dark" class="h-3.5 w-full" />
              </div>
              <div class="flex h-lh items-center">
                <SkeletonBlock surface="dark" class="h-3.5 w-1/2" />
              </div>
            </div>
          </div>
          <SkeletonBlock surface="dark" class="size-11 shrink-0 rounded-full" />
          <SkeletonBlock surface="dark" class="size-5 shrink-0" />
        </div>
        <div class="hidden h-full sm:block">
          <MediaCardSkeleton :detail-rows="skeletonRows" :has-footer="false" stack-rows>
            <template #action>
              <div class="flex items-center gap-3">
                <SkeletonBlock surface="dark" class="h-12 flex-1 rounded-full" />
                <SkeletonBlock surface="dark" class="size-12 shrink-0 rounded-full" />
              </div>
            </template>
          </MediaCardSkeleton>
        </div>
      </li>
    </ul>

    <div v-else-if="props.hasError" role="alert">
      <p :class="LOAD_ERROR_CLASS">
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

    <ul v-else class="grid grid-cols-1 gap-3 sm:gap-6 md:grid-cols-2">
      <Reveal
        v-for="(intervention, index) in props.interventions"
        :key="intervention.id"
        as="li"
        class="min-w-0"
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
import { LOAD_ERROR_CLASS } from '@/constants/feedback'
import { MEDIA_CARD_TONES } from '@/constants/mediaCard'
import {
  CONTENT_ENTER_OFFSET,
  CONTENT_ENTER_TRANSITION,
  REVEAL_MAX_STAGGER_STEPS,
  REVEAL_STAGGER,
} from '@/constants/motion'
import {
  PRO_ROW_SHELL_CLASS,
  PRO_SKELETON_DETAIL_ROWS,
  PRO_SKELETON_DETAIL_ROWS_WITH_DATE,
  PRO_SKELETON_MOBILE_ROW_COUNT,
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

const skeletonCount: number = Math.max(ACCOUNT_SKELETON_CARD_COUNT, PRO_SKELETON_MOBILE_ROW_COUNT)

const skeletonRows: ComputedRef<number> = computed(() =>
  props.showDate ? PRO_SKELETON_DETAIL_ROWS_WITH_DATE : PRO_SKELETON_DETAIL_ROWS,
)

const retryButton: Ref<FocusTarget | null> = ref(null)

defineExpose({ retryButton })
</script>
