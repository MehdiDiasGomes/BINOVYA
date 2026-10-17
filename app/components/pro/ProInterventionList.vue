<template>
  <div>
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
      <button
        ref="retryButton"
        type="button"
        :class="cn(SECONDARY_BUTTON_CLASS, 'mt-3 px-5')"
        @click="emit('retry')"
      >
        <Icon name="RotateCw" :size="16" aria-hidden="true" />
        {{ $t('pro.retry') }}
      </button>
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
        />
      </Reveal>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { MediaCardTitleTag } from '@/types/mediaCard'
import type { ProIntervention } from '@/types/pro'

import {
  ACCOUNT_SKELETON_CARD_COUNT,
  ACCOUNT_SKELETON_MOBILE_CARD_COUNT,
} from '@/constants/account'
import { SECONDARY_BUTTON_CLASS } from '@/constants/buttons'
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
}>()

const skeletonTallRows: ComputedRef<number[]> = computed(() => [
  PRO_SKELETON_PHONE_ROW + (props.showDate ? PRO_SKELETON_DATE_ROWS : 0),
])

const skeletonCollapsedRows: ComputedRef<number> = computed(
  () => PRO_SKELETON_COLLAPSED_ROWS + (props.showDate ? PRO_SKELETON_DATE_ROWS : 0),
)

const retryButton: Ref<HTMLButtonElement | null> = ref(null)

defineExpose({ retryButton })
</script>
