import type { Database } from '@/types/database.types'
import type { ProIntervention, ProInterventionsPage } from '@/types/pro'
import type { ProDayOverview } from '@/types/proAvailability'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { PRO_LIST_STATUSES } from '@/constants/pro'

const loadPaidDays = (
  event: H3Event,
  interventions: ProIntervention[],
): Promise<ProDayOverview[]> => {
  const dates: string[] = paidInterventionDates(interventions)
  if (dates.length === 0) {
    return Promise.resolve([])
  }
  return loadDayOverviewsOfDates(serverSupabaseServiceRole<Database>(event), dates).catch(
    (): ProDayOverview[] => {
      console.error('Interventions day overviews unavailable')
      return []
    },
  )
}

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
  const days: ProDayOverview[] = await loadPaidDays(event, result.interventions)
  return { ...result, interventions: flagInterventionsToMove(result.interventions, days) }
})
