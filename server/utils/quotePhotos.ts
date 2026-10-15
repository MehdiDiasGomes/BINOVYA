import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MultiPartData } from 'h3'

import { QUOTE_MAX_PHOTO_BYTES, QUOTE_MAX_PHOTOS, QUOTE_PHOTOS_BUCKET } from '@/constants/quote'

export type QuotePhoto = {
  data: Buffer
  mimeType: string
  extension: string
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff]
const RIFF_MARKER = 'RIFF'
const WEBP_MARKER = 'WEBP'

const startsWith = (data: Buffer, signature: number[]): boolean =>
  signature.every((byte, index) => data[index] === byte)

const detectImageType = (data: Buffer): Pick<QuotePhoto, 'mimeType' | 'extension'> | null => {
  if (startsWith(data, JPEG_SIGNATURE)) {
    return { mimeType: 'image/jpeg', extension: 'jpg' }
  }
  if (startsWith(data, PNG_SIGNATURE)) {
    return { mimeType: 'image/png', extension: 'png' }
  }
  const isWebp: boolean =
    data.subarray(0, 4).toString('ascii') === RIFF_MARKER &&
    data.subarray(8, 12).toString('ascii') === WEBP_MARKER
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
