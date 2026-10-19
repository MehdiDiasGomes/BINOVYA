import { FetchError } from 'ofetch'

import type { ProInterventionPhotos, ProPhotoKind } from '@/types/pro'
import type { ProPhotoErrorCode, ProPhotoUploadResponse } from '@/types/proPhotos'
import type {
  PhotoPreparation,
  ProPhotoPhase,
  ProPhotoPreviews,
  ProPhotoUploadOptions,
  ProPhotoUploadState,
} from '@/types/proPhotoUpload'

import { PRO_PHOTO_UPLOAD_TIMEOUT_MS } from '@/constants/pro'
import { isFetchTimeoutError, readFetchErrorCode } from '@/utils/fetchError'
import { preparePhotoForUpload } from '@/utils/photoResize'
import { isPhotoErrorCode } from '@/utils/proPhotos'

const EMPTY_PREVIEWS: ProPhotoPreviews = { before: '', after: '' }

const NO_PHOTOS: ProInterventionPhotos = { before: false, after: false }

const uploadErrorCode = (error: unknown): ProPhotoErrorCode | null => {
  const code: unknown = readFetchErrorCode(error)
  if (isPhotoErrorCode(code)) {
    return code
  }
  return error instanceof FetchError && error.statusCode === 413 ? 'tooLarge' : null
}

/**
 * Adds or replaces the before and after photos of one intervention: the picked image is converted
 * to a JPEG in the browser, then sent as the raw body of
 * `PUT /api/pro/bookings/[id]/photos/[kind]`. One upload at a time, held by the page so it goes on
 * while the admin changes step. The stored flags are kept locally until the page reloads the
 * intervention, and the JPEG just sent is shown as a preview. Progress, success and failure are
 * announced in the page live region, whatever step is shown. A timeout leaves the result unknown:
 * the page is told to reload instead of the admin being invited to retry.
 * @param options - Intervention getter, the page announcer and the handler asking the page to
 * reload with a notice
 * @returns Photo flags, previews, busy state, error with its kind and the upload action
 */
export const useProPhotoUpload = (options: ProPhotoUploadOptions): ProPhotoUploadState => {
  const { t } = useI18n()
  const { handleAuthError } = useProAuthError()
  const { announce } = options
  let isActive: boolean = true
  const photos: Ref<ProInterventionPhotos> = ref({
    ...(options.intervention()?.photos ?? NO_PHOTOS),
  })
  const previews: Ref<ProPhotoPreviews> = ref({ ...EMPTY_PREVIEWS })
  const busyKind: Ref<ProPhotoKind | null> = ref(null)
  const phase: Ref<ProPhotoPhase> = ref('idle')
  const errorMessage: Ref<string> = ref('')
  const errorKind: Ref<ProPhotoKind | null> = ref(null)

  watch(
    () => options.intervention()?.photos,
    (stored: ProInterventionPhotos | undefined): void => {
      photos.value = { ...(stored ?? NO_PHOTOS) }
    },
  )

  const kindParams = (kind: ProPhotoKind): Record<string, string> => ({
    kind: t(`pro.photos.kinds.${kind}`),
    name: t(`pro.photos.names.${kind}`),
  })

  const setPreview = (kind: ProPhotoKind, blob: Blob | null): void => {
    if (previews.value[kind]) {
      URL.revokeObjectURL(previews.value[kind])
    }
    previews.value = { ...previews.value, [kind]: blob ? URL.createObjectURL(blob) : '' }
  }

  onBeforeUnmount((): void => {
    isActive = false
    setPreview('before', null)
    setPreview('after', null)
  })

  const fail = async (kind: ProPhotoKind, code: ProPhotoErrorCode | null): Promise<void> => {
    errorKind.value = kind
    errorMessage.value = code
      ? t(`pro.photos.errors.${code}`, kindParams(kind))
      : t('pro.photos.errors.generic', kindParams(kind))
    await announce(errorMessage.value)
  }

  const send = async (kind: ProPhotoKind, blob: Blob, bookingId: string): Promise<void> => {
    phase.value = 'uploading'
    await announce(t('pro.photos.uploadingStatus', kindParams(kind)))
    try {
      const response: ProPhotoUploadResponse = await $fetch<ProPhotoUploadResponse>(
        `/api/pro/bookings/${encodeURIComponent(bookingId)}/photos/${kind}`,
        {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': 'image/jpeg' },
          timeout: PRO_PHOTO_UPLOAD_TIMEOUT_MS,
        },
      )
      photos.value = { ...photos.value, [kind]: true }
      if (!isActive) {
        return
      }
      setPreview(kind, blob)
      await announce(
        t(response.replaced ? 'pro.photos.replaced' : 'pro.photos.saved', kindParams(kind)),
      )
    } catch (error: unknown) {
      if (await handleAuthError(error)) {
        return
      }
      if (isFetchTimeoutError(error)) {
        await options.onOutdated(t('pro.photos.errors.timeout', kindParams(kind)))
        return
      }
      await fail(kind, uploadErrorCode(error))
    }
  }

  const upload = async (kind: ProPhotoKind, file: File): Promise<void> => {
    const bookingId: string | undefined = options.intervention()?.id
    if (busyKind.value || !bookingId) {
      return
    }
    busyKind.value = kind
    phase.value = 'preparing'
    errorMessage.value = ''
    errorKind.value = null
    await announce(t('pro.photos.preparingStatus', kindParams(kind)))
    try {
      const prepared: PhotoPreparation = await preparePhotoForUpload(file)
      if (prepared.ok) {
        await send(kind, prepared.blob, bookingId)
      } else {
        await fail(kind, prepared.code)
      }
    } finally {
      busyKind.value = null
      phase.value = 'idle'
    }
  }

  return {
    photos,
    previews,
    busyKind,
    phase,
    errorMessage,
    errorKind,
    upload,
  }
}
