import type { Database } from '@/types/database.types'
import type { ProInterventionsPage } from '@/types/pro'
import type { ProDayOverview } from '@/types/proAvailability'
import type { SupabaseClient } from '@supabase/supabase-js'

import { serverSupabaseClient } from '#supabase/server'
import { PRO_LIST_STATUSES } from '@/constants/pro'

export default defineEventHandler(async (event): Promise<ProInterventionsPage> => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  await requireAdmin(event)
  const query: ReturnType<typeof proInterventionsQuerySchema.safeParse> =
    proInterventionsQuerySchema.safeParse(getQuery(event))
  if (!query.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid interventions query' })
  }

  const { status, from, to, page } = query.data
  const client: SupabaseClient<Database> = await serverSupabaseClient<Database>(event)
  const result: ProInterventionsPage = await loadInterventionsPage(
    client,
    {
      statuses: status === 'all' ? PRO_LIST_STATUSES : [status],
      from: from ?? null,
      to: to ?? null,
    },
    page,
  )
  const days: ProDayOverview[] = await loadPaidDayOverviews(event, result.interventions)
  return { ...result, interventions: flagInterventionsToMove(result.interventions, days) }
})
