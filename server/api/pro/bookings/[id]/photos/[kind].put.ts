import type { Database } from '@/types/database.types'
import type { ProPhotoUploadResponse } from '@/types/proPhotos'
import type { SupabaseClient } from '@supabase/supabase-js'

import { serverSupabaseServiceRole } from '#supabase/server'
import { PRO_PHOTO_MAX_BYTES } from '@/constants/pro'

export default defineEventHandler(async (event): Promise<ProPhotoUploadResponse> => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  assertSameOrigin(event)
  await requireAdminForWrite(event)
  const params: ReturnType<typeof proBookingParamsSchema.safeParse> =
    proBookingParamsSchema.safeParse(getRouterParams(event))
  if (!params.success) {
    throw bookingNotFound()
  }
  const kindParams: ReturnType<typeof proPhotoKindParamsSchema.safeParse> =
    proPhotoKindParamsSchema.safeParse(getRouterParams(event))
  if (!kindParams.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid photo kind',
      data: { code: 'invalidKind' },
    })
  }
  assertBodySize(event, PRO_PHOTO_MAX_BYTES)
  const data: Buffer = await readPhotoBody(event)

  const client: SupabaseClient<Database> = serverSupabaseServiceRole<Database>(event)
  await assertBookingAcceptsPhotos(client, params.data.id)
  return saveInterventionPhoto(client, {
    bookingId: params.data.id,
    kind: kindParams.data.kind,
    data,
  })
})
