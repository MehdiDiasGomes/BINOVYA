import type { Database } from '@/types/database.types'
import type { ProCompleteResponse } from '@/types/proPhotos'
import type { SupabaseClient } from '@supabase/supabase-js'

import { serverSupabaseServiceRole } from '#supabase/server'

const MAX_BODY_BYTES = 1024

export default defineEventHandler(async (event): Promise<ProCompleteResponse> => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  assertSameOrigin(event)
  await requireAdminForWrite(event)
  const params: ReturnType<typeof proBookingParamsSchema.safeParse> =
    proBookingParamsSchema.safeParse(getRouterParams(event))
  if (!params.success) {
    throw bookingNotFound()
  }
  assertBodySize(event, MAX_BODY_BYTES)
  const body: ReturnType<typeof proCompleteSchema.safeParse> = proCompleteSchema.safeParse(
    await readBody(event),
  )
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid completion request' })
  }

  const client: SupabaseClient<Database> = serverSupabaseServiceRole<Database>(event)
  const result: ProCompleteResponse = await completeBooking(client, {
    bookingId: params.data.id,
    force: body.data.force,
  })
  if (result.customerNotified) {
    event.waitUntil(sendPhotosAvailableEmail(client, result.bookingId))
  }
  return result
})
