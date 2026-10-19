import type { AccountDetailRow } from '@/types/account'
import type { ProInterventionView } from '@/types/pro'
import type {
  ProInterventionCardOptions,
  ProInterventionCardState,
} from '@/types/proInterventionCard'
import type { ProCardAction, ProProgressView } from '@/types/proSteps'
import type { RouteLocationRaw } from 'vue-router'

import { PRO_PROGRESS_VIEWS } from '@/constants/proSteps'
import { bookingDateLabel, bookingServicesLabel } from '@/utils/accountBookingCard'
import { proCustomerName, proInterventionView } from '@/utils/proIntervention'
import {
  interventionCardAction,
  interventionPageRoute,
  interventionProgressStatus,
} from '@/utils/proSteps'

/**
 * Derives what an intervention card shows, shared by the mobile row and the card from `sm` up.
 * @param props - Reactive props of the card: intervention, date display, today and origin
 * @returns Tone, progress, action, page route, customer name, accessible subject, detail rows
 * and whether the date can be changed
 */
export const useProInterventionCard = (
  props: Readonly<ProInterventionCardOptions>,
): ProInterventionCardState => {
  const { t, locale } = useI18n()
  const route = useRoute()

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

  const isReschedulable: ComputedRef<boolean> = computed(() => props.intervention.status === 'paid')

  return { view, progress, action, pageRoute, customerName, subject, rows, isReschedulable }
}
