import type { Database } from '@/types/database.types'
import type { ProAvailability, ProDayOverview, ProWeekdayRule } from '@/types/proAvailability'
import type { SupabaseClient } from '@supabase/supabase-js'

import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { PRO_AVAILABILITY_HORIZON_DAYS, PRO_AVAILABILITY_MAX_RANGE_DAYS } from '@/constants/pro'
import { addDaysToIsoDate, businessToday } from '@/utils/date'
import { isNotableDay } from '@/utils/proAvailability'

export default defineEventHandler(async (event): Promise<ProAvailability> => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  await requireAdmin(event)
  const query: ReturnType<typeof proAvailabilityQuerySchema.safeParse> =
    proAvailabilityQuerySchema.safeParse(getQuery(event))
  if (!query.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid availability query' })
  }

  const from: string = query.data.from ?? businessToday()
  const to: string = query.data.to ?? addDaysToIsoDate(from, PRO_AVAILABILITY_HORIZON_DAYS)
  if (to > addDaysToIsoDate(from, PRO_AVAILABILITY_MAX_RANGE_DAYS)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid availability query' })
  }

  const [rules, days]: [ProWeekdayRule[], ProDayOverview[]] = await Promise.all([
    serverSupabaseClient<Database>(event).then((client: SupabaseClient<Database>) =>
      loadWeekdayRules(client),
    ),
    loadDayOverviews(serverSupabaseServiceRole<Database>(event), from, to),
  ])

  return { from, to, rules, days: days.filter(isNotableDay) }
})
