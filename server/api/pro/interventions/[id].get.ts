import type { Database } from '@/types/database.types'
import type { ProIntervention } from '@/types/pro'
import type { ProDayOverview } from '@/types/proAvailability'
import type { SupabaseClient } from '@supabase/supabase-js'

import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event): Promise<ProIntervention> => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  await requireAdmin(event)
  const params: ReturnType<typeof proBookingParamsSchema.safeParse> =
    proBookingParamsSchema.safeParse(getRouterParams(event))
  if (!params.success) {
    throw bookingNotFound()
  }

  const client: SupabaseClient<Database> = await serverSupabaseClient<Database>(event)
  const intervention: ProIntervention | null = await loadIntervention(client, params.data.id)
  if (!intervention) {
    throw bookingNotFound()
  }
  const [days, adminNote]: [ProDayOverview[], string | null] = await Promise.all([
    loadPaidDayOverviews(event, [intervention]),
    loadAdminNote(event, intervention.id),
  ])
  const [flagged]: ProIntervention[] = flagInterventionsToMove([intervention], days)
  return { ...(flagged ?? intervention), adminNote }
})
