import type { ProIntervention, ProInterventionPhotos, ProPhotoKind } from '@/types/pro'
import type {
  ProCardAction,
  ProInterventionMode,
  ProInterventionOrigin,
  ProInterventionProgress,
  ProStepItem,
  ProStepState,
} from '@/types/proSteps'
import type { LocationQuery, RouteLocationRaw } from 'vue-router'

import { PRO_CREATE_PATH, PRO_HOME_PATH, PRO_INTERVENTIONS_PATH } from '@/constants/pro'
import { PRO_RECREATE_QUERY } from '@/constants/proCreate'
import {
  PRO_LIST_ORIGIN,
  PRO_ORIGIN_QUERY,
  PRO_STEP_PHOTO_KINDS,
  PRO_STEPS,
} from '@/constants/proSteps'
import { proListQuery } from '@/utils/proInterventionsQuery'
import { canCompleteIntervention } from '@/utils/proPhotos'

const DIRECTIONS_STEP: number = 1

const AFTER_STEP: number = PRO_STEPS.indexOf('after') + 1

const BEFORE_STEP: number = PRO_STEPS.indexOf('before') + 1

const RECAP_STEP: number = PRO_STEPS.length

/**
 * Tells how far an intervention went, the status chip of its card: awaiting its payment, its
 * payment link expired, photos taken while it is to do, how it was finished, or cancelled.
 * @param intervention - Intervention shown in BINOVYA Pro
 * @returns Progress of the intervention
 */
export const interventionProgressStatus = (
  intervention: ProIntervention,
): ProInterventionProgress => {
  if (intervention.status === 'cancelled') {
    return 'cancelled'
  }
  if (intervention.status === 'pending_payment') {
    return 'awaitingPayment'
  }
  if (intervention.status === 'expired') {
    return 'linkExpired'
  }
  if (intervention.status === 'completed') {
    return intervention.completedWithoutPhotos ? 'completedWithoutPhotos' : 'completed'
  }
  const { before, after }: ProInterventionPhotos = intervention.photos
  if (before && after) {
    return 'photosDone'
  }
  if (before || after) {
    return before ? 'beforeDone' : 'afterDone'
  }
  return 'todo'
}

/**
 * Tells how the intervention page opens: the step flow for a paid intervention whose day has
 * come, the recap once it is finished, a read-only notice before its day, once cancelled, while
 * its payment link is unpaid or once that link expired.
 * @param intervention - Intervention shown in BINOVYA Pro
 * @param today - Today's ISO date in Paris
 * @returns Mode of the intervention page
 */
export const interventionMode = (
  intervention: ProIntervention,
  today: string,
): ProInterventionMode => {
  if (intervention.status === 'completed' || intervention.status === 'cancelled') {
    return intervention.status
  }
  if (intervention.status === 'pending_payment') {
    return 'awaitingPayment'
  }
  if (intervention.status === 'expired') {
    return 'expired'
  }
  return canCompleteIntervention(intervention, today) ? 'steps' : 'upcoming'
}

/**
 * Picks the step an intervention resumes at, from what the server stored: the directions when no
 * photo exists, the missing photo when only one exists, the recap when both exist.
 * @param photos - Which photos are stored
 * @returns Step number, from 1 to 4
 */
export const initialInterventionStep = (photos: ProInterventionPhotos): number => {
  if (photos.before && photos.after) {
    return RECAP_STEP
  }
  if (photos.before) {
    return AFTER_STEP
  }
  return photos.after ? BEFORE_STEP : DIRECTIONS_STEP
}

/**
 * Reads the `step` query of the intervention page.
 * @param value - Raw query value
 * @returns Step number from 1 to 4, or null when absent or invalid
 */
export const parseStepQuery = (value: unknown): number | null => {
  const step: number = typeof value === 'string' && /^\d$/.test(value) ? Number(value) : 0
  return step >= DIRECTIONS_STEP && step <= RECAP_STEP ? step : null
}

type StepContext = {
  current: number
  photos: ProInterventionPhotos
}

const stepState = (item: Omit<ProStepItem, 'state'>, context: StepContext): ProStepState => {
  if (item.number === context.current) {
    return 'current'
  }
  const kind: ProPhotoKind | undefined = PRO_STEP_PHOTO_KINDS[item.id]
  if (kind) {
    if (context.photos[kind]) {
      return 'done'
    }
    return item.number < context.current ? 'skipped' : 'todo'
  }
  return item.number < context.current ? 'done' : 'todo'
}

/**
 * Lists the four steps with their state: a photo step is done once its photo exists, skipped when
 * the admin moved past it without one, the other steps are done once passed.
 * @param current - Current step number
 * @param photos - Which photos exist, including the ones just sent
 * @returns Steps in order
 */
export const interventionSteps = (current: number, photos: ProInterventionPhotos): ProStepItem[] =>
  PRO_STEPS.map((id, index): ProStepItem => {
    const item: Omit<ProStepItem, 'state'> = { id, number: index + 1 }
    return { ...item, state: stepState(item, { current, photos }) }
  })

/**
 * Picks the main action of an intervention card: start a paid one whose day has come and has no
 * photo, continue it once a photo exists, view any other one.
 * @param intervention - Intervention shown in BINOVYA Pro
 * @param today - Today's ISO date in Paris
 * @returns Action of the card button
 */
export const interventionCardAction = (
  intervention: ProIntervention,
  today: string,
): ProCardAction => {
  if (interventionMode(intervention, today) !== 'steps') {
    return 'view'
  }
  return interventionProgressStatus(intervention) === 'todo' ? 'start' : 'continue'
}

/**
 * Gives the step where a photo is taken.
 * @param kind - Before or after photo
 * @returns Step number of that photo
 */
export const photoStepNumber = (kind: ProPhotoKind): number =>
  kind === 'before' ? BEFORE_STEP : AFTER_STEP

/**
 * Builds the link to the step page of an intervention. From the interventions list, it carries
 * the `origin` flag and the valid filters and page of the list, so the way back restores them.
 * @param bookingId - Identifier of the booking
 * @param origin - Page holding the card
 * @param listQuery - Query of the page holding the card
 * @returns Route of the intervention page
 */
export const interventionPageRoute = (
  bookingId: string,
  origin: ProInterventionOrigin,
  listQuery: LocationQuery = {},
): RouteLocationRaw => ({
  path: `${PRO_INTERVENTIONS_PATH}/${encodeURIComponent(bookingId)}`,
  query:
    origin === 'list' ? { ...proListQuery(listQuery), [PRO_ORIGIN_QUERY]: PRO_LIST_ORIGIN } : {},
})

/**
 * Builds the link creating again an intervention whose payment link expired: the intervention
 * form, filled from it.
 * @param intervention - Intervention shown in BINOVYA Pro
 * @returns Route of the prefilled form, or null when the intervention is not an expired link
 */
export const recreateInterventionRoute = (
  intervention: ProIntervention,
): RouteLocationRaw | null =>
  intervention.status === 'expired'
    ? { path: PRO_CREATE_PATH, query: { [PRO_RECREATE_QUERY]: intervention.id } }
    : null

/**
 * Reads where the admin came from, from the `origin` query of the intervention page.
 * @param value - Raw query value
 * @returns The interventions list when asked, the planning otherwise
 */
export const parseOriginQuery = (value: unknown): ProInterventionOrigin =>
  value === PRO_LIST_ORIGIN ? 'list' : 'planning'

/**
 * Gives the BINOVYA Pro section an intervention page belongs to, the page the admin opened it from.
 * @param origin - Page the admin came from
 * @returns Path of the interventions list or of the planning
 */
export const interventionSectionPath = (origin: ProInterventionOrigin): string =>
  origin === 'list' ? PRO_INTERVENTIONS_PATH : PRO_HOME_PATH

/**
 * Builds the way back from the intervention page: the interventions list with only its valid
 * filters and page read from the query, or the planning of the intervention's day.
 * @param origin - Page the admin came from
 * @param scheduledDate - ISO date of the intervention, empty while unknown
 * @param query - Query of the intervention page
 * @returns Route of the previous page
 */
export const interventionBackRoute = (
  origin: ProInterventionOrigin,
  scheduledDate: string,
  query: LocationQuery = {},
): RouteLocationRaw => {
  if (origin === 'list') {
    return { path: PRO_INTERVENTIONS_PATH, query: proListQuery(query) }
  }
  return scheduledDate ? { path: PRO_HOME_PATH, query: { date: scheduledDate } } : PRO_HOME_PATH
}
