import type { Database } from '@/types/database.types'
import type { ProCreatePrefill } from '@/types/proCreate'
import type { SupabaseClient } from '@supabase/supabase-js'

import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event): Promise<ProCreatePrefill> => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  await requireAdmin(event)
  const params: ReturnType<typeof proBookingParamsSchema.safeParse> =
    proBookingParamsSchema.safeParse(getRouterParams(event))
  if (!params.success) {
    throw bookingNotFound()
  }

  const client: SupabaseClient<Database> = serverSupabaseServiceRole<Database>(event)
  const prefill: ProCreatePrefill | null = await loadRecreatePrefill(client, params.data.id)
  if (!prefill) {
    throw bookingNotFound()
  }
  return prefill
})
