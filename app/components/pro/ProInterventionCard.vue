<template>
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
      <div ref="actionsRef" class="flex items-center gap-3">
        <AppButton
          :to="localePath(pageRoute)"
          variant="onDark"
          :trailing-icon="action === 'view' ? undefined : 'ArrowRight'"
          class="min-w-0 flex-1 gap-2.5"
        >
          {{ $t(`pro.card.actions.${action}`) }}
          <span class="sr-only">{{ subject }}</span>
        </AppButton>
        <DropdownMenu v-if="isReschedulable">
          <DropdownMenuTrigger as-child>
            <AppButton variant="onDarkGhost" data-pro-reschedule class="size-12 shrink-0 px-0">
              <Icon name="Ellipsis" :size="20" aria-hidden="true" />
              <span class="sr-only">{{ $t('pro.card.moreName', { subject }) }}</span>
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
  </MediaCard>
</template>

<script setup lang="ts">
import type { AccountDetailRow } from '@/types/account'
import type { MediaCardTitleTag } from '@/types/mediaCard'
import type { ProIntervention, ProInterventionView } from '@/types/pro'
import type { ProCardAction, ProInterventionOrigin, ProProgressView } from '@/types/proSteps'
import type { RouteLocationRaw } from 'vue-router'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DETAIL_ROW_CLASS } from '@/constants/mediaCard'
import { PRO_PROGRESS_VIEWS } from '@/constants/proSteps'
import { bookingDateLabel, bookingServicesLabel } from '@/utils/accountBookingCard'
import { proCustomerName, proInterventionView } from '@/utils/proIntervention'
import {
  interventionCardAction,
  interventionPageRoute,
  interventionProgressStatus,
} from '@/utils/proSteps'

const props = withDefaults(
  defineProps<{
    intervention: ProIntervention
    titleTag?: MediaCardTitleTag
    showDate?: boolean
    today?: string
    origin?: ProInterventionOrigin
  }>(),
  {
    titleTag: 'h3',
    showDate: false,
    today: '',
    origin: 'planning',
  },
)

const emit = defineEmits<{
  reschedule: [trigger: HTMLElement | null]
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const actionsRef: Ref<HTMLElement | null> = ref(null)

const isReschedulePending: Ref<boolean> = ref(false)

const isReschedulable: ComputedRef<boolean> = computed(() => props.intervention.status === 'paid')

const view: ComputedRef<ProInterventionView> = computed(() =>
  proInterventionView(props.intervention),
)

const progress: ComputedRef<ProProgressView> = computed(
  () => PRO_PROGRESS_VIEWS[interventionProgressStatus(props.intervention)],
)

const action: ComputedRef<ProCardAction> = computed(() =>
  interventionCardAction(props.intervention, props.today),
)

const pageRoute: ComputedRef<RouteLocationRaw> = computed(() =>
  interventionPageRoute(props.intervention.id, props.origin, route.query),
)

const customerName: ComputedRef<string> = computed(() =>
  proCustomerName(props.intervention.customer, t),
)

const dateLabel: ComputedRef<string> = computed(() =>
  bookingDateLabel(props.intervention.scheduledDate, locale.value),
)

const subject: ComputedRef<string> = computed(() =>
  props.showDate
    ? t('pro.card.subjectDated', { name: customerName.value, date: dateLabel.value })
    : t('pro.card.subject', { name: customerName.value }),
)

const rows: ComputedRef<AccountDetailRow[]> = computed(() => [
  ...(props.showDate ? [{ labelKey: 'pro.intervention.date', value: dateLabel.value }] : []),
  { labelKey: 'pro.intervention.bins', value: bookingServicesLabel(props.intervention, t) },
  {
    labelKey: 'pro.intervention.plan',
    value: t(`booking.plans.${props.intervention.plan}.title`),
  },
])

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
  emit('reschedule', actionsRef.value?.querySelector<HTMLElement>('[data-pro-reschedule]') ?? null)
}
</script>
