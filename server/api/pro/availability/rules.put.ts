import type { Database } from '@/types/database.types'
import type { ProWeekdayRule } from '@/types/proAvailability'
import type { SupabaseClient } from '@supabase/supabase-js'

import { serverSupabaseServiceRole } from '#supabase/server'

const MAX_BODY_BYTES = 2 * 1024

export default defineEventHandler(async (event): Promise<ProWeekdayRule[]> => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  assertSameOrigin(event)
  await requireAdminForWrite(event)
  assertBodySize(event, MAX_BODY_BYTES)
  const body: ReturnType<typeof proWeekdayRulesSchema.safeParse> = proWeekdayRulesSchema.safeParse(
    await readBody(event),
  )
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid weekday rules' })
  }

  const client: SupabaseClient<Database> = serverSupabaseServiceRole<Database>(event)
  await saveWeekdayRules(client, body.data.rules)
  return loadWeekdayRules(client)
})
