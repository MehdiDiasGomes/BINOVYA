import type {
  AccountBookingDetail,
  AccountBookingDocuments,
  AccountBookingRecord,
} from '@/types/account'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event): Promise<AccountBookingDetail> => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const customerId: string = await requireCustomerId(event)
  const params: ReturnType<typeof accountBookingParamsSchema.safeParse> =
    accountBookingParamsSchema.safeParse(getRouterParams(event))
  if (!params.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid booking id' })
  }

  const client: SupabaseClient<Database> = await serverSupabaseClient<Database>(event)
  const record: AccountBookingRecord | null = await loadAccountBooking(
    client,
    customerId,
    params.data.id,
  )
  if (!record) {
    throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
  }

  const documents: AccountBookingDocuments = await loadAccountBookingDocuments(client, record)
  return { booking: record.booking, documents }
})
