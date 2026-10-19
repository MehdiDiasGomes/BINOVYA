import type { ProIntervention, ProInterventionPhotos, ProPhotoKind } from '@/types/pro'
import type { ProPhotoErrorCode } from '@/types/proPhotos'
import type { Ref } from 'vue'

export type ProPhotoPhase = 'idle' | 'preparing' | 'uploading'

export type ProPhotoPreviews = Record<ProPhotoKind, string>

export type ProPhotoUploadOptions = {
  intervention: () => ProIntervention | null
  announce: (text: string) => Promise<void>
  onOutdated: (notice: string) => Promise<void>
}

export type ProPhotoUploadState = {
  photos: Readonly<Ref<ProInterventionPhotos>>
  previews: Readonly<Ref<ProPhotoPreviews>>
  busyKind: Readonly<Ref<ProPhotoKind | null>>
  phase: Readonly<Ref<ProPhotoPhase>>
  errorMessage: Readonly<Ref<string>>
  errorKind: Readonly<Ref<ProPhotoKind | null>>
  upload: (kind: ProPhotoKind, file: File) => Promise<void>
}

export type PhotoPreparation =
  | { ok: true; blob: Blob }
  | { ok: false; code: Extract<ProPhotoErrorCode, 'unreadable' | 'tooLarge'> }
