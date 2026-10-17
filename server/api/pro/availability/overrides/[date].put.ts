import type { Database } from '@/types/database.types'
import type { ProDayOverview } from '@/types/proAvailability'
import type { SupabaseClient } from '@supabase/supabase-js'

import { serverSupabaseServiceRole } from '#supabase/server'
import { businessToday } from '@/utils/date'

const MAX_BODY_BYTES = 4 * 1024

export default defineEventHandler(async (event): Promise<ProDayOverview | null> => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  assertSameOrigin(event)
  await requireAdminForWrite(event)
  const params: ReturnType<typeof proDateParamsSchema.safeParse> = proDateParamsSchema.safeParse(
    getRouterParams(event),
  )
  if (!params.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid date' })
  }
  if (params.data.date < businessToday()) {
    throw createError({ statusCode: 422, statusMessage: 'Past date' })
  }
  assertBodySize(event, MAX_BODY_BYTES)
  const body: ReturnType<typeof proDayOverrideSchema.safeParse> = proDayOverrideSchema.safeParse(
    await readBody(event),
  )
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid day exception' })
  }
  if (body.data.sector) {
    requireSignedMunicipality(body.data.sector)
  }

  const client: SupabaseClient<Database> = serverSupabaseServiceRole<Database>(event)
  await saveDayOverride(client, params.data.date, body.data)
  return loadDayOverview(client, params.data.date)
})
