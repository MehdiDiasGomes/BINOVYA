import type { Database } from '@/types/database.types'
import type { ProInterventionDays } from '@/types/proInterventionDays'
import type { SupabaseClient } from '@supabase/supabase-js'

import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event): Promise<ProInterventionDays> => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  await requireAdmin(event)
  const query: ReturnType<typeof proInterventionDaysQuerySchema.safeParse> =
    proInterventionDaysQuerySchema.safeParse(getQuery(event))
  if (!query.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid interventions days query' })
  }

  const client: SupabaseClient<Database> = await serverSupabaseClient<Database>(event)
  return { days: await loadInterventionDayCounts(client, query.data) }
})
