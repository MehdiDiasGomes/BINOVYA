import type { GeoPoint } from '@/types/booking'
import type { Database } from '@/types/database.types'
import type { ProIntervention, ProPlanning } from '@/types/pro'
import type { ProDayOverview } from '@/types/proAvailability'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { businessToday } from '@/utils/date'

const loadPlanningDay = (event: H3Event, date: string): Promise<ProDayOverview | null> =>
  loadDayOverview(serverSupabaseServiceRole<Database>(event), date).catch(
    (): ProDayOverview | null => {
      console.error('Planning day overview unavailable')
      return null
    },
  )

export default defineEventHandler(async (event): Promise<ProPlanning> => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  await requireAdmin(event)
  const query: ReturnType<typeof proPlanningQuerySchema.safeParse> =
    proPlanningQuerySchema.safeParse(getQuery(event))
  if (!query.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid planning query' })
  }

  const date: string = query.data.date ?? businessToday()
  const client: SupabaseClient<Database> = await serverSupabaseClient<Database>(event)
  const [interventions, depot, day]: [ProIntervention[], GeoPoint | null, ProDayOverview | null] =
    await Promise.all([
      loadDayInterventions(client, date),
      loadDepot(client),
      loadPlanningDay(event, date),
    ])

  return {
    date,
    depot,
    interventions: flagInterventionsToMove(interventions, day ? [day] : []),
    day,
  }
})
