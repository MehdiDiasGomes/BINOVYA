<template>
  <article
    :aria-labelledby="titleId"
    :class="cn(PRO_ROW_SHELL_CLASS, MEDIA_CARD_TONES[view.tone].surface)"
  >
    <span
      aria-hidden="true"
      :class="
        cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full',
          PRO_ROW_TONE_CLASSES[view.tone],
        )
      "
    >
      <Icon :name="progress.icon" :size="20" :stroke-width="2.5" />
    </span>
    <div class="min-w-0 flex-1">
      <p class="sr-only">{{ $t(progress.labelKey) }}</p>
      <component
        :is="props.titleTag"
        class="truncate font-heading text-base font-bold leading-tight"
      >
        <NuxtLink
          :to="localePath(pageRoute)"
          :aria-label="linkName"
          class="rounded-2xl after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-[3px] focus-visible:after:ring-inset focus-visible:after:ring-white"
        >
          <span :id="titleId">{{ customerName }}</span>
        </NuxtLink>
      </component>
      <p class="line-clamp-2 break-words text-sm text-white/80">{{ props.intervention.address }}</p>
      <dl class="line-clamp-2 min-w-0 break-words text-sm text-white/80">
        <div v-for="(row, index) in rows" :key="row.labelKey" class="inline">
          <dt class="sr-only">{{ $t(row.labelKey) }}</dt>
          <dd class="inline">
            <span v-if="index > 0" aria-hidden="true" class="px-1">·</span>{{ row.value }}
          </dd>
        </div>
      </dl>
      <ProToMoveBadge v-if="props.intervention.isToMove" class="mt-1 px-2 py-0.5 text-xs" />
    </div>
    <AppButton
      v-if="recreateRoute"
      :to="localePath(recreateRoute)"
      variant="onDarkGhost"
      size="sm"
      icon="RotateCcw"
      class="z-10 shrink-0 gap-1.5 px-3"
    >
      {{ $t('pro.card.recreate') }}
      <span class="sr-only">{{ subject }}</span>
    </AppButton>
    <ProRescheduleMenu
      v-if="isReschedulable"
      :subject="subject"
      trigger-class="size-11 min-h-11 px-0"
      class="relative z-10 shrink-0"
      @reschedule="emit('reschedule', $event)"
    />
    <Icon name="ChevronRight" :size="20" aria-hidden="true" class="shrink-0 text-white/70" />
  </article>
</template>

<script setup lang="ts">
import type {
  ProInterventionCardProps,
  ProInterventionCardState,
} from '@/types/proInterventionCard'

import { MEDIA_CARD_TONES } from '@/constants/mediaCard'
import { PRO_ROW_SHELL_CLASS, PRO_ROW_TONE_CLASSES } from '@/constants/pro'
import { PRO_INTERVENTION_CARD_DEFAULTS } from '@/constants/proInterventionCard'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<ProInterventionCardProps>(), PRO_INTERVENTION_CARD_DEFAULTS)

const emit = defineEmits<{
  reschedule: [trigger: HTMLElement | null]
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const titleId: string = useId()

const {
  view,
  progress,
  action,
  pageRoute,
  customerName,
  subject,
  rows,
  isReschedulable,
  recreateRoute,
}: ProInterventionCardState = useProInterventionCard(props)

const linkName: ComputedRef<string> = computed(() =>
  [t(`pro.card.actions.${action.value}`), subject.value].join(' '),
)
</script>
