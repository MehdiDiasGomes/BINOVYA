import type { Database } from '@/types/database.types'
import type { QuotePayload, QuoteResponse } from '@/types/quote'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MultiPartData } from 'h3'

import { serverSupabaseServiceRole } from '#supabase/server'
import { QUOTE_MAX_PHOTO_BYTES, QUOTE_MAX_PHOTOS } from '@/constants/quote'
import { normalizeEmail } from '~~/server/utils/emailAddress'

const MULTIPART_OVERHEAD_BYTES = 64 * 1024
const MAX_BODY_BYTES = QUOTE_MAX_PHOTOS * QUOTE_MAX_PHOTO_BYTES + MULTIPART_OVERHEAD_BYTES

const readPayload = (parts: MultiPartData[]): QuotePayload => {
  const rawPayload: MultiPartData | undefined = parts.find(part => part.name === 'payload')
  if (!rawPayload) {
    throw createError({ statusCode: 400, statusMessage: 'Missing payload' })
  }
  try {
    return quotePayloadSchema.parse(JSON.parse(rawPayload.data.toString('utf8')))
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payload' })
  }
}

export default defineEventHandler(async (event): Promise<QuoteResponse> => {
  assertBodySize(event, MAX_BODY_BYTES)

  const parts: MultiPartData[] | undefined = await readMultipartFormData(event)
  if (!parts) {
    throw createError({ statusCode: 400, statusMessage: 'Expected a multipart form' })
  }

  const payload: QuotePayload = readPayload(parts)
  const quoteId: string = crypto.randomUUID()
  if (payload.website) {
    return { quoteId }
  }

  requireSignedAddress(payload.address)
  const photos: QuotePhoto[] = extractQuotePhotos(parts)
  const client: SupabaseClient<Database> = serverSupabaseServiceRole<Database>(event)
  const photoPaths: string[] = await uploadQuotePhotos(client, quoteId, photos)

  const { contact, address } = payload
  const email: string = normalizeEmail(contact.email)
  const comment: string = payload.comment.trim()
  const { error } = await client.from('quote_requests').insert({
    id: quoteId,
    first_name: contact.firstName.trim(),
    last_name: contact.lastName.trim(),
    company: contact.company?.trim() || null,
    email,
    phone: contact.phone.trim(),
    address: address.label,
    city: address.city,
    postcode: address.postcode,
    country_code: address.countryCode,
    latitude: address.latitude,
    longitude: address.longitude,
    equipment: payload.equipment,
    small_bin_count: payload.smallBinCount,
    large_bin_count: payload.largeBinCount,
    plan: payload.plan,
    comment: comment || null,
    photo_paths: photoPaths,
  })
  if (error) {
    await removeQuotePhotos(client, photoPaths)
    throw createError({ statusCode: 500, statusMessage: 'Quote could not be saved' })
  }

  await notifyQuoteRequest(client, {
    firstName: contact.firstName.trim(),
    lastName: contact.lastName.trim(),
    company: contact.company?.trim() ?? '',
    email,
    phone: contact.phone.trim(),
    address: address.label,
    equipment: payload.equipment,
    smallBinCount: payload.smallBinCount,
    largeBinCount: payload.largeBinCount,
    plan: payload.plan,
    comment,
    photoPaths,
  })

  return { quoteId }
})
