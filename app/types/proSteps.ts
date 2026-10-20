import type { LucideIconName } from '@/constants/clients'
import type { ProInterventionPhotos, ProPhotoKind } from '@/types/pro'
import type { ComputedRef, Ref } from 'vue'
import type { RouteLocationRaw, RouterHistory } from 'vue-router'

export type ProStepId = 'directions' | 'before' | 'after' | 'recap'

export type ProStepState = 'done' | 'skipped' | 'current' | 'todo'

export type ProStepItem = {
  id: ProStepId
  number: number
  state: ProStepState
}

export type ProInterventionProgress =
  | 'todo'
  | 'beforeDone'
  | 'afterDone'
  | 'photosDone'
  | 'completed'
  | 'completedWithoutPhotos'
  | 'cancelled'
  | 'awaitingPayment'
  | 'linkExpired'

export type ProInterventionMode =
  | 'steps'
  | 'completed'
  | 'upcoming'
  | 'cancelled'
  | 'awaitingPayment'
  | 'expired'

export type ProCardAction = 'start' | 'continue' | 'view'

export type ProInterventionOrigin = 'planning' | 'list'

export type ProProgressView = {
  labelKey: string
  icon: LucideIconName
}

export type ProStepPhotoKinds = Partial<Record<ProStepId, ProPhotoKind>>

export type ProInterventionStepsOptions = {
  photos: () => ProInterventionPhotos
  initialStep: () => number
  onStepChange: (notice: string) => void
}

export type ProInterventionStepsState = {
  currentStep: ComputedRef<number>
  currentId: ComputedRef<ProStepId>
  steps: ComputedRef<ProStepItem[]>
  titleRef: Ref<HTMLElement | null>
  stepRoute: (step: number) => RouteLocationRaw
  goToStep: (step: number) => Promise<void>
}

export type ProHistoryListener = Parameters<RouterHistory['listen']>[0]

export type ProHistoryDirection = Parameters<ProHistoryListener>[2]['direction']

export type ProInterventionBack = {
  backRoute: ComputedRef<RouteLocationRaw>
  backLabel: ComputedRef<string>
}
