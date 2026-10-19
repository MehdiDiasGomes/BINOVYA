import type { Database } from '@/types/database.types'
import type { ProInterventionPhotos, ProPhotoKind } from '@/types/pro'
import type {
  ProPhotoErrorCode,
  ProPhotoStatusRefusal,
  ProPhotoUploadResponse,
} from '@/types/proPhotos'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Error, H3Event } from 'h3'

import {
  INTERVENTION_PHOTOS_BUCKET,
  PRO_PHOTO_CACHE_CONTROL_SECONDS,
  PRO_PHOTO_MAX_BYTES,
} from '@/constants/pro'
import { businessToday } from '@/utils/date'
import { hasJpegSignature, stripJpegMetadata } from '@/utils/image'
import { photoStatusRefusal } from '@/utils/proPhotos'

type SetPhotoRow =
  Database['public']['Functions']['admin_set_intervention_photo']['Returns'][number]

type SetPhotoRefusal = NonNullable<SetPhotoRow['reason']>

type PhotoRow = Pick<
  Database['public']['Tables']['intervention_photos']['Row'],
  'booking_id' | 'kind'
>

export type InterventionPhotoUpload = {
  bookingId: string
  kind: ProPhotoKind
  data: Buffer
}

const photoError = (statusCode: number, statusMessage: string, code: ProPhotoErrorCode): H3Error =>
  createError({ statusCode, statusMessage, data: { code } })

const REJECTIONS: Record<SetPhotoRefusal, () => H3Error> = {
  not_found: () => photoError(404, 'Booking not found', 'notFound'),
  not_paid: () => photoError(422, 'Booking cannot get photos', 'notPaid'),
  future_date: () => photoError(422, 'Booking day has not come', 'futureDate'),
  invalid_kind: () => photoError(400, 'Invalid photo kind', 'invalidKind'),
  invalid_path: () => createError({ statusCode: 500, statusMessage: 'Photo not saved' }),
}

const STATUS_REJECTIONS: Record<ProPhotoStatusRefusal, () => H3Error> = {
  notPaid: REJECTIONS.not_paid,
  futureDate: REJECTIONS.future_date,
}

/**
 * Builds the storage path of a before or after photo, `{booking_id}/{kind}.jpg`, the only one
 * `admin_set_intervention_photo` accepts: a replacement overwrites the previous file.
 * @param bookingId - Identifier of the booking
 * @param kind - Before or after
 * @returns Path inside the `intervention-photos` bucket
 */
export const interventionPhotoPath = (bookingId: string, kind: ProPhotoKind): string =>
  `${bookingId}/${kind}.jpg`

/**
 * Reads the raw body of a photo upload, checks it is a real JPEG of at most 5 MB, from its
 * structure, never from the declared type, and drops its metadata (EXIF with GPS, XMP, comments).
 * `assertBodySize` must run first.
 * @param event - Incoming request
 * @returns The cleaned JPEG bytes
 * @throws 400 `invalidImage` for an empty, non-JPEG or malformed body, or bytes after its end,
 * 413 `tooLarge` above 5 MB
 */
export const readPhotoBody = async (event: H3Event): Promise<Buffer> => {
  const body: Buffer | undefined = await readRawBody(event, false)
  if (body && body.length > PRO_PHOTO_MAX_BYTES) {
    throw photoError(413, 'Request too large', 'tooLarge')
  }
  const cleaned: Uint8Array | null = body && hasJpegSignature(body) ? stripJpegMetadata(body) : null
  if (!cleaned) {
    throw photoError(400, 'Invalid photo', 'invalidImage')
  }
  return Buffer.from(cleaned.buffer, cleaned.byteOffset, cleaned.byteLength)
}

/**
 * Checks that a booking can receive photos before anything is uploaded, so a refused booking
 * leaves no file in the bucket. The RPC checks it again under the row lock.
 * @param client - Supabase client using the secret key, after `requireAdminForWrite`
 * @param bookingId - Identifier of the booking
 * @throws 404 `notFound`, 422 `notPaid` for a status other than paid or completed, 422
 * `futureDate` for a paid booking whose day has not come, 500 when the database fails
 */
export const assertBookingAcceptsPhotos = async (
  client: SupabaseClient<Database>,
  bookingId: string,
): Promise<void> => {
  const { data, error } = await client
    .from('bookings')
    .select('status, scheduled_date')
    .eq('id', bookingId)
    .maybeSingle()
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Photo not saved' })
  }
  if (!data) {
    throw REJECTIONS.not_found()
  }
  const refusal: ProPhotoStatusRefusal | null = photoStatusRefusal(
    data.status,
    data.scheduled_date,
    businessToday(),
  )
  if (refusal) {
    throw STATUS_REJECTIONS[refusal]()
  }
}

const hasStoredPhoto = async (
  client: SupabaseClient<Database>,
  photo: InterventionPhotoUpload,
): Promise<boolean> => {
  const { data, error } = await client
    .from('intervention_photos')
    .select('booking_id')
    .eq('booking_id', photo.bookingId)
    .eq('kind', photo.kind)
    .maybeSingle()
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Photo not saved' })
  }
  return Boolean(data)
}

const isStillUnrecorded = (
  client: SupabaseClient<Database>,
  photo: InterventionPhotoUpload,
): Promise<boolean> =>
  hasStoredPhoto(client, photo).then(
    (stored: boolean): boolean => !stored,
    (): boolean => false,
  )

const removeOrphanPhoto = async (
  client: SupabaseClient<Database>,
  bookingId: string,
  path: string,
): Promise<void> => {
  try {
    const { error } = await client.storage.from(INTERVENTION_PHOTOS_BUCKET).remove([path])
    if (error) {
      throw error
    }
  } catch {
    console.error(`Intervention photo cleanup failed for booking ${bookingId}`)
  }
}

/**
 * Stores a before or after photo in the private bucket, replacing the previous one in place, then
 * records it through `admin_set_intervention_photo`. Never sends a mail. When the RPC refuses the
 * photo and no row of this kind exists, before the upload nor after the refusal, the uploaded file
 * is removed so no file is left without its row. A transient RPC failure keeps the file: a
 * concurrent upload of the same kind may have recorded it in the meantime.
 * @param client - Supabase client using the secret key, after `requireAdminForWrite`
 * @param photo - Booking, kind and JPEG bytes already checked
 * @returns Whether an existing photo was replaced
 * @throws 404, 422 or 400 with `data.code`, 500 when storage or the database fails
 */
export const saveInterventionPhoto = async (
  client: SupabaseClient<Database>,
  photo: InterventionPhotoUpload,
): Promise<ProPhotoUploadResponse> => {
  const path: string = interventionPhotoPath(photo.bookingId, photo.kind)
  const hadPhoto: boolean = await hasStoredPhoto(client, photo)
  const { error: uploadError } = await client.storage
    .from(INTERVENTION_PHOTOS_BUCKET)
    .upload(path, photo.data, {
      upsert: true,
      contentType: 'image/jpeg',
      cacheControl: PRO_PHOTO_CACHE_CONTROL_SECONDS,
    })
  if (uploadError) {
    console.error(`Intervention photo upload failed for booking ${photo.bookingId}`)
    throw createError({ statusCode: 500, statusMessage: 'Photo not saved' })
  }
  const { data, error } = await client.rpc('admin_set_intervention_photo', {
    p_booking_id: photo.bookingId,
    p_kind: photo.kind,
    p_storage_path: path,
  })
  const row: SetPhotoRow | undefined = data?.[0]
  if (!error && row?.ok) {
    return { bookingId: photo.bookingId, kind: photo.kind, replaced: Boolean(row.replaced) }
  }
  if (!hadPhoto && row && !row.ok && (await isStillUnrecorded(client, photo))) {
    await removeOrphanPhoto(client, photo.bookingId, path)
  }
  if (row && !row.ok && row.reason) {
    throw REJECTIONS[row.reason]()
  }
  throw createError({ statusCode: 500, statusMessage: 'Photo not saved' })
}

/**
 * Tells, for each booking, which photos are stored. Relies on RLS: the client must carry an admin
 * session.
 * @param client - Supabase client of the logged-in admin
 * @param bookingIds - Bookings of a page or a day
 * @returns Photo flags by booking id, bookings without photos are absent
 * @throws 500 when the database cannot be read
 */
export const loadInterventionPhotoFlags = async (
  client: SupabaseClient<Database>,
  bookingIds: string[],
): Promise<Map<string, ProInterventionPhotos>> => {
  const flags: Map<string, ProInterventionPhotos> = new Map()
  if (bookingIds.length === 0) {
    return flags
  }
  const { data, error } = await client
    .from('intervention_photos')
    .select('booking_id, kind')
    .in('booking_id', bookingIds)
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Interventions unavailable' })
  }
  data.forEach((row: PhotoRow): void => {
    const current: ProInterventionPhotos = flags.get(row.booking_id) ?? {
      before: false,
      after: false,
    }
    flags.set(row.booking_id, { ...current, [row.kind]: true })
  })
  return flags
}
