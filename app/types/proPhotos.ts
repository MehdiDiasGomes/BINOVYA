import type { ProIntervention, ProPhotoKind } from '@/types/pro'

export type ProPhotoErrorCode =
  | 'notFound'
  | 'notPaid'
  | 'futureDate'
  | 'invalidKind'
  | 'invalidImage'
  | 'tooLarge'
  | 'unreadable'

export type ProPhotoStatusRefusal = Extract<ProPhotoErrorCode, 'notPaid' | 'futureDate'>

export type ProPhotoUploadResponse = {
  bookingId: string
  kind: ProPhotoKind
  replaced: boolean
}

export type ProCompleteErrorCode =
  | 'notFound'
  | 'alreadyCompleted'
  | 'notPaid'
  | 'futureDate'
  | 'missingPhotos'

export type ProCompleteRequest = {
  force: boolean
}

export type ProCompleteResponse = {
  bookingId: string
  withoutPhotos: boolean
  customerNotified: boolean
}

export type ProCompletedEvent = ProCompleteResponse & {
  intervention: ProIntervention
}

export type PhotoDimensions = {
  width: number
  height: number
}
