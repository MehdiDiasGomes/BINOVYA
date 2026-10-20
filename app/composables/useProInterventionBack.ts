import type { ProInterventionBack, ProInterventionOrigin } from '@/types/proSteps'
import type { RouteLocationRaw } from 'vue-router'

import { PRO_ORIGIN_QUERY } from '@/constants/proSteps'
import { interventionBackRoute, parseOriginQuery } from '@/utils/proSteps'

/**
 * Builds the way back from an intervention page: the interventions list with its filters when the
 * admin came from it, the planning of the intervention's day otherwise.
 * @param scheduledDate - Getter of the ISO date of the intervention, empty while unknown
 * @returns Route and label of the way back
 */
export const useProInterventionBack = (scheduledDate: () => string): ProInterventionBack => {
  const { t } = useI18n()
  const route = useRoute()

  const origin: ComputedRef<ProInterventionOrigin> = computed(() =>
    parseOriginQuery(route.query[PRO_ORIGIN_QUERY]),
  )

  const backRoute: ComputedRef<RouteLocationRaw> = computed(() =>
    interventionBackRoute(origin.value, scheduledDate(), route.query),
  )

  const backLabel: ComputedRef<string> = computed(() =>
    origin.value === 'list' ? t('pro.steps.backList') : t('pro.steps.backPlanning'),
  )

  return { backRoute, backLabel }
}
