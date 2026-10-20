import type { AccountDetailRow } from '@/types/account'
import type { MediaCardTitleTag } from '@/types/mediaCard'
import type { ProIntervention, ProInterventionView } from '@/types/pro'
import type { ProCardAction, ProInterventionOrigin, ProProgressView } from '@/types/proSteps'
import type { ComputedRef } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

export type ProInterventionCardOptions = {
  intervention: ProIntervention
  showDate: boolean
  today: string
  origin: ProInterventionOrigin
}

export type ProInterventionCardDefaults = Omit<ProInterventionCardOptions, 'intervention'> & {
  titleTag: MediaCardTitleTag
}

export type ProInterventionCardProps = Pick<ProInterventionCardOptions, 'intervention'> &
  Partial<ProInterventionCardDefaults>

export type ProInterventionCardState = {
  view: ComputedRef<ProInterventionView>
  progress: ComputedRef<ProProgressView>
  action: ComputedRef<ProCardAction>
  pageRoute: ComputedRef<RouteLocationRaw>
  customerName: ComputedRef<string>
  subject: ComputedRef<string>
  rows: ComputedRef<AccountDetailRow[]>
  isReschedulable: ComputedRef<boolean>
  recreateRoute: ComputedRef<RouteLocationRaw | null>
}
