import type { Database } from '@/types/database.types'
import type { ProRescheduleErrorCode, ProRescheduleResponse } from '@/types/proAvailability'
import type { SupabaseClient } from '@supabase/supabase-js'

import { serverSupabaseServiceRole } from '#supabase/server'

const MAX_BODY_BYTES = 1024

export default defineEventHandler(async (event): Promise<ProRescheduleResponse> => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  assertSameOrigin(event)
  await requireAdminForWrite(event)
  const params: ReturnType<typeof proBookingParamsSchema.safeParse> =
    proBookingParamsSchema.safeParse(getRouterParams(event))
  if (!params.success) {
    throw bookingNotFound()
  }
  assertBodySize(event, MAX_BODY_BYTES)
  const body: ReturnType<typeof proRescheduleSchema.safeParse> = proRescheduleSchema.safeParse(
    await readBody(event),
  )
  if (!body.success) {
    const code: ProRescheduleErrorCode = isBeyondProHorizon(body.error) ? 'tooFar' : 'invalidDate'
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid reschedule request',
      data: { code },
    })
  }

  const client: SupabaseClient<Database> = serverSupabaseServiceRole<Database>(event)
  const result: ProRescheduleResponse = await rescheduleBooking(client, {
    bookingId: params.data.id,
    date: body.data.date,
    force: body.data.force,
  })
  event.waitUntil(sendBookingRescheduleEmail(client, result.bookingId, result.oldDate))
  return result
})
