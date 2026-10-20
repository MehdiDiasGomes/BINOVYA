import type { Database } from '@/types/database.types'
import type { ProPaymentLinkResponse } from '@/types/proCreate'
import type { SupabaseClient } from '@supabase/supabase-js'

import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event): Promise<ProPaymentLinkResponse> => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  assertSameOrigin(event)
  await requireAdminForWrite(event)
  const params: ReturnType<typeof proBookingParamsSchema.safeParse> =
    proBookingParamsSchema.safeParse(getRouterParams(event))
  if (!params.success) {
    throw bookingNotFound()
  }

  const client: SupabaseClient<Database> = serverSupabaseServiceRole<Database>(event)
  return resendPaymentLink(client, params.data.id)
})
