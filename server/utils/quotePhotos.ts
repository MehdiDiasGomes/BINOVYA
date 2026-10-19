import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MultiPartData } from 'h3'

import { QUOTE_MAX_PHOTO_BYTES, QUOTE_MAX_PHOTOS, QUOTE_PHOTOS_BUCKET } from '@/constants/quote'
import { hasJpegSignature, hasSignature } from '@/utils/image'

export type QuotePhoto = {
  data: Buffer
  mimeType: string
  extension: string
}

const PNG_SIGNATURE: number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const RIFF_SIGNATURE: number[] = [0x52, 0x49, 0x46, 0x46]
const WEBP_SIGNATURE: number[] = [0x57, 0x45, 0x42, 0x50]
const WEBP_SIGNATURE_OFFSET: number = 8

const detectImageType = (data: Buffer): Pick<QuotePhoto, 'mimeType' | 'extension'> | null => {
  if (hasJpegSignature(data)) {
    return { mimeType: 'image/jpeg', extension: 'jpg' }
  }
  if (hasSignature(data, PNG_SIGNATURE)) {
    return { mimeType: 'image/png', extension: 'png' }
  }
  const isWebp: boolean =
    hasSignature(data, RIFF_SIGNATURE) &&
    hasSignature(data.subarray(WEBP_SIGNATURE_OFFSET), WEBP_SIGNATURE)
  return isWebp ? { mimeType: 'image/webp', extension: 'webp' } : null
}

/**
 * Keeps the uploaded photos of a multipart request after checking count, size and real format.
 * The format is read from the file signature, never from the type declared by the browser.
 * @param parts - Parts of the multipart request
 * @returns Valid photos
 */
export const extractQuotePhotos = (parts: MultiPartData[]): QuotePhoto[] => {
  const files: MultiPartData[] = parts.filter(part => part.name === 'photos' && part.filename)
  if (files.length > QUOTE_MAX_PHOTOS) {
    throw createError({ statusCode: 400, statusMessage: 'Too many photos' })
  }

  return files.map(file => {
    const type = detectImageType(file.data)
    if (file.data.length > QUOTE_MAX_PHOTO_BYTES || !type) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid photo' })
    }
    return { data: file.data, ...type }
  })
}

/**
 * Stores the photos of a quote request in the private bucket.
 * @param client - Supabase client using the secret key
 * @param quoteId - Identifier of the quote request, used as folder name
 * @param photos - Photos already validated
 * @returns Storage path of each photo
 */
export const uploadQuotePhotos = async (
  client: SupabaseClient<Database>,
  quoteId: string,
  photos: QuotePhoto[],
): Promise<string[]> => {
  const results: (string | null)[] = await Promise.all(
    photos.map(async (photo, index) => {
      const path = `${quoteId}/${index + 1}.${photo.extension}`
      const { error } = await client.storage
        .from(QUOTE_PHOTOS_BUCKET)
        .upload(path, photo.data, { contentType: photo.mimeType })
      return error ? null : path
    }),
  )

  const uploaded: string[] = results.filter((path): path is string => path !== null)
  if (uploaded.length !== photos.length) {
    await removeQuotePhotos(client, uploaded)
    throw createError({ statusCode: 500, statusMessage: 'Photo upload failed' })
  }
  return uploaded
}

/**
 * Deletes stored quote photos, used to clean up when a quote request could not be saved.
 * @param client - Supabase client using the secret key
 * @param paths - Storage paths to delete
 */
export const removeQuotePhotos = async (
  client: SupabaseClient<Database>,
  paths: string[],
): Promise<void> => {
  if (paths.length > 0) {
    await client.storage.from(QUOTE_PHOTOS_BUCKET).remove(paths)
  }
}
