import type { AccountTranslate } from '@/types/account'
import type { ProIntervention, ProInterventionPhotos, ProPhotoKind } from '@/types/pro'
import type {
  ProCompleteErrorCode,
  ProPhotoErrorCode,
  ProPhotoStatusRefusal,
} from '@/types/proPhotos'

import { PHOTO_KINDS } from '@/constants/photos'
import {
  PRO_COMPLETE_ERROR_CODES,
  PRO_PHOTO_ERROR_CODES,
  PRO_PHOTO_STATUSES,
} from '@/constants/pro'

/**
 * Tells whether a value is a known photo refusal code, to pick its translated message.
 * @param code - Raw `data.code` of a failed upload, or a code of the browser preparation
 * @returns True for a photo refusal code
 */
export const isPhotoErrorCode = (code: unknown): code is ProPhotoErrorCode =>
  (PRO_PHOTO_ERROR_CODES as unknown[]).includes(code)

/**
 * Tells whether a value is a known refusal code of « Finish the intervention ».
 * @param code - Raw `data.code` of a failed request
 * @returns True for a completion refusal code
 */
export const isCompleteErrorCode = (code: unknown): code is ProCompleteErrorCode =>
  (PRO_COMPLETE_ERROR_CODES as unknown[]).includes(code)

/**
 * Lists the photos still missing on an intervention, in the before, after order.
 * @param photos - Which photos are stored
 * @returns Missing kinds, empty when both photos exist
 */
export const missingPhotoKinds = (photos: ProInterventionPhotos): ProPhotoKind[] =>
  PHOTO_KINDS.filter(kind => !photos[kind])

/**
 * Tells why a booking cannot receive photos, the rule shared by BINOVYA Pro and the upload route:
 * only a paid booking whose day has come, or a completed one, even long after.
 * @param status - Status of the booking
 * @param scheduledDate - ISO date of the intervention
 * @param today - Today's ISO date in Paris
 * @returns The refusal code, or null when photos are accepted
 */
export const photoStatusRefusal = (
  status: string,
  scheduledDate: string,
  today: string,
): ProPhotoStatusRefusal | null => {
  if (!(PRO_PHOTO_STATUSES as string[]).includes(status)) {
    return 'notPaid'
  }
  return status === 'paid' && scheduledDate > today ? 'futureDate' : null
}

/**
 * Tells whether an intervention can be finished: paid, and its day has come. A future one never
 * can, even by force.
 * @param intervention - Intervention shown in BINOVYA Pro
 * @param today - Today's ISO date in Paris
 * @returns True when « Finish the intervention » is shown
 */
export const canCompleteIntervention = (intervention: ProIntervention, today: string): boolean =>
  intervention.status === 'paid' && intervention.scheduledDate <= today

/**
 * Names the missing photos in a sentence, such as « la photo avant » or « les photos avant et
 * après ».
 * @param kinds - Missing kinds, from `missingPhotoKinds`
 * @param t - Translation function of the page
 * @returns Translated label, « au moins une photo » when the kinds are unknown
 */
export const missingPhotosLabel = (kinds: ProPhotoKind[], t: AccountTranslate): string => {
  const [onlyKind]: ProPhotoKind[] = kinds
  if (kinds.length === 1 && onlyKind) {
    return t(`pro.complete.missing.${onlyKind}`, {})
  }
  return kinds.length > 1
    ? t('pro.complete.missing.both', {})
    : t('pro.complete.missing.unknown', {})
}
