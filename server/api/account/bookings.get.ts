import type { AccountBooking, AccountOverview } from '@/types/account'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event): Promise<AccountOverview> => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const customerId: string = await requireCustomerId(event)
  const client: SupabaseClient<Database> = await serverSupabaseClient<Database>(event)

  const { data: profile, error } = await client
    .from('profiles')
    .select('first_name, deletion_requested_at')
    .eq('id', customerId)
    .maybeSingle()
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Bookings unavailable' })
  }
  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: 'Account not found' })
  }

  const bookings: AccountBooking[] = await loadAccountBookings(client, customerId)

  return {
    firstName: profile.first_name,
    deletionRequestedAt: profile.deletion_requested_at,
    bookings,
  }
})
