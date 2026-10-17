import type { GeoPoint } from '@/types/booking'
import type { Database } from '@/types/database.types'
import type { ProIntervention, ProPlanning } from '@/types/pro'
import type { SupabaseClient } from '@supabase/supabase-js'

import { serverSupabaseClient } from '#supabase/server'
import { businessToday } from '@/utils/date'

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
  const [interventions, depot]: [ProIntervention[], GeoPoint | null] = await Promise.all([
    loadDayInterventions(client, date),
    loadDepot(client),
  ])

  return { date, depot, interventions }
})
