<template>
  <div class="h-full">
    <ProInterventionRow v-bind="props" class="sm:hidden" @reschedule="emit('reschedule', $event)" />
    <div class="hidden h-full sm:block">
      <MediaCard
        :title="customerName"
        :subtitle="props.intervention.address"
        :title-tag="props.titleTag"
        :tone="view.tone"
      >
        <template #eyebrow>
          <Icon
            :name="progress.icon"
            :size="16"
            :stroke-width="2.5"
            aria-hidden="true"
            class="shrink-0"
          />
          <p>{{ $t(progress.labelKey) }}</p>
        </template>

        <div class="flex flex-1 flex-col">
          <ProToMoveBadge v-if="props.intervention.isToMove" class="mb-3" />
          <dl class="grid gap-2 text-[15px]">
            <div v-for="row in rows" :key="row.labelKey" :class="DETAIL_ROW_CLASS">
              <dt class="text-white/80">{{ $t(row.labelKey) }}</dt>
              <dd class="break-words font-semibold sm:text-right">{{ row.value }}</dd>
            </div>
          </dl>
        </div>

        <template #action>
          <div class="flex items-center gap-3">
            <AppButton
              :to="localePath(pageRoute)"
              variant="onDark"
              :trailing-icon="action === 'view' ? undefined : 'ArrowRight'"
              class="min-w-0 flex-1 gap-2.5"
            >
              {{ $t(`pro.card.actions.${action}`) }}
              <span class="sr-only">{{ subject }}</span>
            </AppButton>
            <ProRescheduleMenu
              v-if="isReschedulable"
              :subject="subject"
              trigger-class="size-12 shrink-0 px-0"
              class="shrink-0"
              @reschedule="emit('reschedule', $event)"
            />
          </div>
        </template>
      </MediaCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  ProInterventionCardProps,
  ProInterventionCardState,
} from '@/types/proInterventionCard'

import { DETAIL_ROW_CLASS } from '@/constants/mediaCard'
import { PRO_INTERVENTION_CARD_DEFAULTS } from '@/constants/proInterventionCard'

const props = withDefaults(defineProps<ProInterventionCardProps>(), PRO_INTERVENTION_CARD_DEFAULTS)

const emit = defineEmits<{
  reschedule: [trigger: HTMLElement | null]
}>()

const localePath = useLocalePath()

const {
  view,
  progress,
  action,
  pageRoute,
  customerName,
  subject,
  rows,
  isReschedulable,
}: ProInterventionCardState = useProInterventionCard(props)
</script>
